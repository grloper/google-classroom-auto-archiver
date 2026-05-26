import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('Starting Playwright...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.route('**/health', route => route.fulfill({ json: { ok: true, counts: { courses: 1, topics: 1, materials: 1, attachments: 1 } } }));
  await page.route('**/courses', route => route.fulfill({
    json: {
      generated_at: new Date().toISOString(),
      courses: [
        {
          id: 'c1', name: 'Software Engineering 101', teacher: 'Dr. Jane Smith', section: 'Fall Semester',
          topics: [
            {
              id: 't1', title: 'Week 1: Architecture',
              materials: [
                {
                  id: 'm1', title: 'System Design Project', type: 'Assignment', due_date: 'Oct 15',
                  description: 'Create a UML diagram for the proposed architecture.\nEnsure you cover both client and server components.',
                  attachments: [
                    { id: 'a1', filename: 'requirements.pdf', status: 'complete', local_path: '/local/archive/c1/requirements.pdf', provider: 'file', size_bytes: 2048000 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }));
  await page.route('**/plan', route => route.fulfill({
    json: {
      courses: [
        {
          id: 'c1', name: 'Software Engineering 101', teacher: 'Dr. Jane Smith', section: 'Fall Semester',
          topics: [
            {
              id: 't1', title: 'Week 1: Architecture',
              materials: [
                {
                  id: 'm1', title: 'System Design Project', type: 'Assignment', due_date: 'Oct 15',
                  attachments: [
                    { id: 'a1', filename: 'requirements.pdf', size_bytes: 2048000, provider: 'file' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }));
  await page.route('**/selection', route => route.fulfill({ json: { selection_mode: 'implicit', excluded_attachment_ids: [] } }));
  await page.route('**/db/files', route => route.fulfill({
    json: [
      { id: 'a1', filename: 'requirements.pdf', status: 'complete', local_path: '/local/archive/c1/requirements.pdf', course_name: 'Software Engineering 101' }
    ]
  }));

  console.log('Navigating to UI...');
  await page.goto('http://127.0.0.1:4317');
  
  await page.waitForTimeout(3000); // Wait for React render and health check

  fs.mkdirSync('docs/assets', { recursive: true });

  console.log('Capturing Archive view...');
  await page.click('text=THE_ARCHIVE');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/ui-archive.png' });

  console.log('Capturing Telemetry view...');
  await page.click('text=TELEMETRY');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/ui-telemetry.png' });

  console.log('Capturing Download Plan view...');
  await page.click('text=DL_PLAN');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/ui-dl-plan.png' });

  console.log('Capturing Config view...');
  await page.click('text=CONFIG');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/ui-config.png' });

  await browser.close();
  console.log('Screenshots saved to docs/assets/');
})();
