import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from './database.js';

const placeholderPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ54AAAAASUVORK5CYII=',
  'base64',
);

export async function seedDatabase(uploadDirectory) {
  if (await db('users').first('id')) return;
  if (uploadDirectory) {
    await fs.mkdir(uploadDirectory, { recursive: true });
    for (const filename of ['sample_streetlight.png', 'sample_garbage.png', 'sample_water.png']) {
      const filePath = path.join(uploadDirectory, filename);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, placeholderPng, { flag: 'wx' });
      }
    }
  }

  const now = Date.now();
  const timestamp = (offset) => new Date(now - offset).toISOString();
  const legacyTimestamp = (offset) => timestamp(offset).replace('T', ' ').replace('Z', '000');

  await db.transaction(async (trx) => {
    await trx('users').insert([
      {
        id: 'u-citizen-1',
        full_name: 'Rajesh Kumar',
        mobile_number: '9876543210',
        address: '12, Hazratganj, Lucknow',
        city: 'Lucknow',
        district: 'Lucknow',
        latitude: 26.8467,
        longitude: 80.9462,
        is_authority: false,
      },
      {
        id: 'u-citizen-2',
        full_name: 'Priya Sharma',
        mobile_number: '9876543211',
        address: 'Sector 4, Aliganj, Lucknow',
        city: 'Lucknow',
        district: 'Lucknow',
        latitude: 26.8894,
        longitude: 80.9385,
        is_authority: false,
      },
      {
        id: 'u-authority-1',
        full_name: 'Admin Nagar Palika',
        mobile_number: '9999999999',
        address: 'Municipal Office, Hazratganj',
        city: 'Lucknow',
        district: 'Lucknow',
        latitude: 26.8456,
        longitude: 80.9443,
        is_authority: true,
      },
    ]);

    await trx('authority_routing_map').insert([
      ['Waste Collection', 'Lucknow Nagar Nigam (SWM Dept)', 'swm@lucknownagarvigam.in'],
      ['Streetlight Fault', 'LNN Streetlight Division', 'streetlights@lucknownagarvigam.in'],
      ['Electricity', 'MVVNL (Madhyanchal Vidyut Vitran)', '1912@mvvnl.in'],
      ['Water Supply', 'Lucknow Jal Sansthan', 'jalsansthan@lucknow.nic.in'],
      ['Road Damage', 'PWD Lucknow Division', 'pwd-lucknow@up.nic.in'],
    ].map(([category, authority_name, authority_contact]) => ({
      id: randomUUID(),
      category,
      city: 'Lucknow',
      authority_name,
      authority_contact,
    })));

    await trx('posts').insert([
      {
        id: 'p-news-1',
        user_id: 'u-citizen-1',
        type: 'news',
        text: 'Hazratganj crossing is congested due to waterlogging after evening rain. Avoid this route towards Charbagh.',
        latitude: 26.8467,
        longitude: 80.9462,
        city: 'Lucknow',
        district: 'Lucknow',
        status: 'resolved',
        likes_count: 1,
        upvotes_count: 1,
        comments_count: 1,
        created_at: timestamp(3 * 60 * 60 * 1000),
      },
      {
        id: 'p-news-2',
        user_id: 'u-citizen-2',
        type: 'news',
        text: 'Lucknow Mahotsav will begin on November 25th at Kanshiram Smriti Upvan, with cultural events and local crafts.',
        latitude: 26.8015,
        longitude: 80.9022,
        city: 'Lucknow',
        district: 'Lucknow',
        status: 'resolved',
        likes_count: 0,
        upvotes_count: 20,
        comments_count: 0,
        created_at: legacyTimestamp(18 * 60 * 60 * 1000),
      },
      {
        id: 'p-comp-1',
        user_id: 'u-citizen-1',
        type: 'complaint',
        category: 'Streetlight Fault',
        text: 'All streetlights on Shahnajaf Road have been out for three nights, making the road unsafe for pedestrians.',
        media_url: '/api/v1/feed/media/sample_streetlight.png',
        latitude: 26.8501,
        longitude: 80.949,
        city: 'Lucknow',
        district: 'Lucknow',
        status: 'pending',
        likes_count: 0,
        upvotes_count: 1,
        comments_count: 0,
        created_at: timestamp(2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'p-comp-2',
        user_id: 'u-citizen-2',
        type: 'complaint',
        category: 'Waste Collection',
        text: 'Garbage has accumulated near the Sector 4 community park. The collection truck has not visited in over a week.',
        media_url: '/api/v1/feed/media/sample_garbage.png',
        latitude: 26.8902,
        longitude: 80.9392,
        city: 'Lucknow',
        district: 'Lucknow',
        status: 'in_progress',
        likes_count: 0,
        upvotes_count: 1,
        comments_count: 1,
        created_at: timestamp(5 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'p-comp-3',
        user_id: 'u-citizen-1',
        type: 'complaint',
        category: 'Water Supply',
        text: 'Dirty brown water has been flowing from residential taps in LDA Colony since yesterday morning.',
        media_url: '/api/v1/feed/media/sample_water.png',
        latitude: 26.7904,
        longitude: 80.9015,
        city: 'Lucknow',
        district: 'Lucknow',
        status: 'forwarded',
        likes_count: 0,
        upvotes_count: 0,
        comments_count: 0,
        created_at: timestamp(24 * 60 * 60 * 1000),
      },
    ]);

    await trx('likes').insert({
      id: randomUUID(),
      post_id: 'p-news-1',
      user_id: 'u-citizen-2',
      created_at: timestamp(2 * 60 * 60 * 1000),
    });
    await trx('upvotes').insert([
      { id: randomUUID(), post_id: 'p-news-1', user_id: 'u-citizen-2' },
      { id: randomUUID(), post_id: 'p-comp-1', user_id: 'u-citizen-2' },
      { id: randomUUID(), post_id: 'p-comp-2', user_id: 'u-citizen-1' },
    ]);
    await trx('comments').insert([
      {
        id: randomUUID(),
        post_id: 'p-news-1',
        user_id: 'u-citizen-2',
        text: 'Traffic is crawling near Hazratganj. Avoid the area.',
      },
      {
        id: randomUUID(),
        post_id: 'p-comp-2',
        user_id: 'u-authority-1',
        text: 'Forwarded to the zonal sanitation officer for action.',
      },
    ]);

    const jobs = [
      ['Delivery Executive', 'Delivery', 'Charbagh', '15,000 - 20,000 / month'],
      ['Retail Store Assistant', 'Shop Staff', 'Hazratganj', '10,000 - 12,000 / month'],
      ['Office Helper', 'Office Staff', 'Kapoorthala', '8,000 - 9,500 / month'],
    ];
    await trx('jobs').insert(jobs.map(([title, category, location_area, salary_range], index) => ({
      id: randomUUID(),
      posted_by_user_id: index === 1 ? 'u-citizen-2' : 'u-citizen-1',
      title,
      description: `Local ${category.toLowerCase()} opening in Lucknow. Contact the employer for details.`,
      category,
      contact_name: ['Ramesh Cargo Logistix', 'Aman (Manager)', 'Pankaj Sharma'][index],
      contact_number: ['9876500111', '9876500222', '9876500333'][index],
      location_area,
      city: 'Lucknow',
      district: 'Lucknow',
      salary_range,
      is_active: true,
      created_at: timestamp((index + 1) * 60 * 60 * 1000),
      expires_at: new Date(now + [30, 15, 20][index] * 24 * 60 * 60 * 1000).toISOString(),
    })));

  });
}
