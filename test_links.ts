import fetch from 'node-fetch';

const API_TOKEN = 'pk_87908883_PNJX99ZBG343SRG53Z7AKLEKLBOQCOQU';
const HEADERS = { 'Authorization': API_TOKEN, 'Content-Type': 'application/json' };
const BASE_URL = 'https://api.clickup.com/api/v2';

async function run() {
  const configListId = '901326190559';
  const response = await fetch(`${BASE_URL}/list/${configListId}/task?archived=false`, {
    headers: HEADERS
  });
  const data = await response.json();
  const tasks = data.tasks || [];

  const links: Record<string, string> = {};
  tasks.forEach((task: any) => {
    if (task.description) {
      links[task.name] = task.description;
    }
  });
  console.log(links);
}

run();
