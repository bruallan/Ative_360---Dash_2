import requests
import json
import os

API_TOKEN = os.environ.get('CLICKUP_API_TOKEN', 'pk_87908883_PNJX99ZBG343SRG53Z7AKLEKLBOQCOQU')
HEADERS = {'Authorization': API_TOKEN, 'Content-Type': 'application/json'}
BASE_URL = 'https://api.clickup.com/api/v2'

res = requests.get(f"{BASE_URL}/team/9013412527/space", headers=HEADERS)
spaces = res.json().get('spaces', [])
for space in spaces:
    print(f"Space: {space['name']} ({space['id']})")
    if "Ative 360" in space['name']:
        res_folders = requests.get(f"{BASE_URL}/space/{space['id']}/folder", headers=HEADERS)
        folders = res_folders.json().get('folders', [])
        for folder in folders:
            print(f"  Folder: {folder['name']} ({folder['id']})")
            if "Apoio" in folder['name']:
                res_lists = requests.get(f"{BASE_URL}/folder/{folder['id']}/list", headers=HEADERS)
                lists = res_lists.json().get('lists', [])
                for lst in lists:
                    print(f"    List: {lst['name']} ({lst['id']})")
