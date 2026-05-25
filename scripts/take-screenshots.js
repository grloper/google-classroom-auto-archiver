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
                  description: 'Create a UML diagram for the proposed architecture.',
                  attachments: [
                    { id: 'a1', filename: 'requirements.pdf', status: 'complete', local_path: '/dummy/path/requirements.pdf', provider: 'file' }
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
      { id: 'a1', filename: 'requirements.pdf', status: 'complete', local_path: '/dummy/path/requirements.pdf', course_name: 'Software Engineering 101' }
    ]
  }));

  console.log('Navigating to UI...');
  await page.goto('http://127.0.0.1:4317');
  
  await page.waitForTimeout(2000); // Wait for React render

  fs.mkdirSync('docs/assets', { recursive: true });

  console.log('Capturing Classroom view...');
  await page.click('text=My Classroom');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/classroom-view.png' });

  console.log('Capturing Settings view...');
  await page.click('text=System Details');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/settings-reset.png' });

  await browser.close();
  console.log('Screenshots saved to docs/assets/');
})();