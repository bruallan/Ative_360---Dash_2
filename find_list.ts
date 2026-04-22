import fetch from 'node-fetch';

const API_TOKEN = 'pk_87908883_PNJX99ZBG343SRG53Z7AKLEKLBOQCOQU';
const HEADERS = { 'Authorization': API_TOKEN, 'Content-Type': 'application/json' };
const BASE_URL = 'https://api.clickup.com/api/v2';

async function run() {
  const spaceId = '901313601110';
  const resFolders = await fetch(`${BASE_URL}/space/${spaceId}/folder`, { headers: HEADERS });
  const foldersData = await resFolders.json();
  const folders = foldersData.folders || [];
  for (const folder of folders) {
    console.log(`  Folder: ${folder.name} (${folder.id})`);
    const resLists = await fetch(`${BASE_URL}/folder/${folder.id}/list`, { headers: HEADERS });
    const listsData = await resLists.json();
    const lists = listsData.lists || [];
    for (const lst of lists) {
      console.log(`    List: ${lst.name} (${lst.id})`);
    }
  }
  
  const resLists = await fetch(`${BASE_URL}/space/${spaceId}/list`, { headers: HEADERS });
  const listsData = await resLists.json();
  const lists = listsData.lists || [];
  for (const lst of lists) {
    console.log(`  Folderless List: ${lst.name} (${lst.id})`);
  }
}

run();
