import path from 'node:path';
import fs from 'fs-extra';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import { downloadDriveAttachment } from './driveDownloader.js';
import { saveAttachmentReference } from './referenceDownloader.js';
import { config } from '../config.js';
import { materialOutputDir, resolveOutputPath } from '../utils/paths.js';
import { retry, sleep } from '../utils/retry.js';

async function localPathExists(localPath, activeConfig) {
  if (!localPath) return false;
  return fs.pathExists(resolveOutputPath(localPath, activeConfig));
}

export async function downloadAllAttachments({ db, drive, logger, activeConfig = config, selection = null }) {
  let attachments = db.listAttachmentsForDownload();
  
  if (selection) {
    const includedAttachmentIds = new Set(selection.selected_attachment_ids || []);
    const excludedAttachmentIds = new Set(selection.excluded_attachment_ids || []);
    const includedMaterialIds = new Set(selection.selected_material_ids || []);
    const includedTopicIds = new Set(selection.selected_topic_ids || []);
    const includedCourseIds = new Set(selection.selected_course_ids || []);
    const filters = selection.filters || {};

    const filteredAttachments = [];
    for (const a of attachments) {
      if (excludedAttachmentIds.has(a.id)) {
        db.updateAttachmentDownload(a.id, { status: 'skipped', raw: { skipped_reason: 'user_unselected' }});
        continue;
      }

      let included = false;
      if (selection.selection_mode === 'explicit') {
        if (includedAttachmentIds.has(a.id) || includedMaterialIds.has(a.material_id) || includedTopicIds.has(a.topic_id) || includedCourseIds.has(a.course_id)) {
          included = true;
        }
      } else {
        // implicit mode implies everything not excluded is included subject to filters
        included = true;
      }

      if (included && filters) {
        if (filters.material_types?.length && !filters.material_types.includes(a.material_type)) included = false;
        if (filters.mime_types?.length && !filters.mime_types.includes(a.mime_type)) included = false;
        if (filters.providers?.length && !filters.providers.includes(a.provider)) included = false;
        if (filters.query && !(a.filename || '').toLowerCase().includes(filters.query.toLowerCase())) included = false;
      }

      if (!included) {
        db.updateAttachmentDownload(a.id, { status: 'skipped', raw: { skipped_reason: 'user_unselected' }});
      } else {
        filteredAttachments.push(a);
      }
    }
    attachments = filteredAttachments;
  }

  if (!attachments.length) {
    logger?.info?.('No pending attachments to download');
    return { downloaded: 0, skipped: 0, failed: 0 };
  }

  logger?.info?.(`Downloading ${attachments.length} pending attachments`);

  const limit = pLimit(activeConfig.maxConcurrentDownloads);
  const progress = new cliProgress.SingleBar(
    {
      format: 'downloads |{bar}| {value}/{total} {filename}',
      hideCursor: true
    },
    cliProgress.Presets.shades_classic
  );
  progress.start(attachments.length, 0, { filename: '' });

  const stats = { downloaded: 0, skipped: 0, failed: 0 };

  await Promise.all(
    attachments.map((attachment) =>
      limit(async () => {
        progress.update({ filename: path.basename(attachment.filename || attachment.id).slice(0, 32) });

        try {
          if (await localPathExists(attachment.local_path, activeConfig)) {
            stats.skipped += 1;
            progress.increment();
            return;
          }

          const duplicate = db.findCompletedAttachmentByFileId(attachment.file_id);
          if (duplicate && (await localPathExists(duplicate.local_path, activeConfig))) {
            db.updateAttachmentDownload(attachment.id, {
              status: 'complete',
              local_path: duplicate.local_path,
              filename: duplicate.filename,
              mime_type: duplicate.mime_type,
              raw: {
                duplicate_of: duplicate.id,
                downloaded_files: [
                  {
                    label: 'duplicate',
                    filename: duplicate.filename,
                    mime_type: duplicate.mime_type,
                    local_path: duplicate.local_path
                  }
                ]
              }
            });
            stats.skipped += 1;
            progress.increment();
            return;
          }

          const destinationDir = materialOutputDir(attachment, activeConfig);
          let result;

          if (attachment.provider === 'drive' && drive) {
            result = await retry(
              () => downloadDriveAttachment({ drive, attachment, destinationDir, logger, activeConfig }),
              { retries: activeConfig.maxRetries, logger }
            );
          } else {
            result = await saveAttachmentReference({ attachment, destinationDir, activeConfig });
          }

          db.updateAttachmentDownload(attachment.id, {
            status: 'complete',
            error: null,
            ...result
          });

          stats.downloaded += 1;
          await sleep(activeConfig.requestDelayMs);
        } catch (error) {
          logger?.warn?.(`Failed to download ${attachment.filename || attachment.id}: ${error.message}`);
          db.updateAttachmentDownload(attachment.id, {
            status: 'failed',
            error: error.message
          });
          stats.failed += 1;
        } finally {
          progress.increment();
        }
      })
    )
  );

  progress.stop();
  logger?.info?.(`Download complete: ${stats.downloaded} downloaded, ${stats.skipped} skipped, ${stats.failed} failed`);
  return stats;
}
