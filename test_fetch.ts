import fetch from 'node-fetch';

const API_TOKEN = 'pk_87908883_PNJX99ZBG343SRG53Z7AKLEKLBOQCOQU';
const HEADERS = { 'Authorization': API_TOKEN, 'Content-Type': 'application/json' };
const BASE_URL = 'https://api.clickup.com/api/v2';

async function run() {
  const url = `${BASE_URL}/team/9013412527/task?space_ids[]=901310539280&space_ids[]=901313601110&include_closed=true`;
  const res = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  console.log(`Both spaces: ${data.tasks?.length} tasks`);
}

run();
