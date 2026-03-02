import { useEffect, useState } from 'react';
import { Loader2, Folder, List, Layout, Database } from 'lucide-react';

export default function HierarchyExplorer() {
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        // First get team ID
        const membersRes = await fetch('/api/members');
        const membersData = await membersRes.json();
        const teamId = membersData.teams?.[0]?.id;

        if (!teamId) throw new Error("No team found");

        const res = await fetch(`/api/hierarchy?team_id=${teamId}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        setHierarchy(data.hierarchy || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-8">Error: {error}</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Workspace Hierarchy</h1>
      <div className="space-y-4">
        {hierarchy.map((space: any) => (
          <div key={space.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">{space.name} (ID: {space.id})</h2>
            </div>
            
            <div className="pl-6 space-y-4">
              {/* Folders */}
              {space.folders?.map((folder: any) => (
                <div key={folder.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{folder.name} (ID: {folder.id})</span>
                  </div>
                  
                  {/* Lists in Folder */}
                  <div className="pl-6 space-y-1">
                    {folder.lists?.map((list: any) => (
                      <div key={list.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <List className="w-3 h-3" />
                        <span>{list.name} (ID: {list.id})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Folderless Lists */}
              {space.lists?.map((list: any) => (
                <div key={list.id} className="flex items-center gap-2 text-sm text-gray-600 pl-4">
                  <List className="w-3 h-3" />
                  <span>{list.name} (ID: {list.id})</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
