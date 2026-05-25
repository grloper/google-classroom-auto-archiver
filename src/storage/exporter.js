import path from 'node:path';
import fs from 'fs-extra';
import { config } from '../config.js';
import { safeSegment } from '../utils/paths.js';

export async function exportArchive(db, activeConfig = config) {
  const graph = db.getCoursesGraph();
  const masterPath = path.join(activeConfig.paths.outputRoot, 'master_index.json');
  await fs.ensureDir(activeConfig.paths.outputRoot);
  await fs.writeJson(masterPath, graph, { spaces: 2 });

  for (const course of graph.courses) {
    const courseDir = path.join(activeConfig.paths.coursesRoot, safeSegment(course.name || course.id));
    await fs.ensureDir(courseDir);
    await fs.writeJson(path.join(courseDir, 'course.json'), course, { spaces: 2 });

    for (const topic of course.topics) {
      const topicDir = path.join(courseDir, safeSegment(topic.title || topic.id));
      await fs.ensureDir(topicDir);
      await fs.writeJson(path.join(topicDir, 'topic.json'), topic, { spaces: 2 });
    }
  }

  db.setState('last_export', {
    generated_at: graph.generated_at,
    path: masterPath,
    courses: graph.courses.length
  });

  return { masterPath, graph };
}

export async function exportDownloadPlan(db, activeConfig = config) {
  const graph = db.getCoursesGraph();
  
  const plan = {
    generated_at: new Date().toISOString(),
    courses: graph.courses.map(c => ({
      id: c.id,
      name: c.name,
      teacher: c.teacher,
      selected_default: true,
      topics: c.topics.map(t => ({
        id: t.id,
        title: t.title,
        materials: t.materials.map(m => ({
          id: m.id,
          title: m.title,
          type: m.type,
          due_date: m.due_date,
          attachments: m.attachments.map(a => ({
            id: a.id,
            filename: a.filename,
            mime_type: a.mime_type,
            provider: a.provider,
            file_id: a.file_id,
            size_bytes: a.bytes || null,
            downloadable: a.provider === 'drive' || a.provider === 'youtube' || a.provider === 'form' || a.provider === 'link',
            selected_default: true,
            skip_reason: null
          }))
        }))
      }))
    }))
  };

  const planPath = path.join(activeConfig.paths.outputRoot, 'download_plan.json');
  await fs.ensureDir(activeConfig.paths.outputRoot);
  await fs.writeJson(planPath, plan, { spaces: 2 });
  db.saveDownloadPlan(plan);
  
  return { planPath, plan };
}
