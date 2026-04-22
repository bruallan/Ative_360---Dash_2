import fetch from 'node-fetch';

const API_TOKEN = 'pk_87908883_PNJX99ZBG343SRG53Z7AKLEKLBOQCOQU';
const HEADERS = { 'Authorization': API_TOKEN, 'Content-Type': 'application/json' };
const BASE_URL = 'https://api.clickup.com/api/v2';

async function run() {
  const configListId = '901326190559';
  const response = await fetch(`${BASE_URL}/list/${configListId}/task?include_closed=true`, {
    headers: HEADERS
  });
  const data = await response.json();
  const tasks = data.tasks || [];

  if (tasks.length > 0) {
    const task = tasks.find((t: any) => t.name === 'BP Sousa') || tasks[0];
    console.log("Task Name:", task.name);
    const field = task.custom_fields?.find((f: any) => f.id === '833454be-cd31-4eb6-9b9d-64496b2740d0');
    console.log("Custom Field Data:", JSON.stringify(field, null, 2));
  } else {
    console.log("No tasks found");
  }
}

run();
