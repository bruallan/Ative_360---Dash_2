async function triggerSync() {
  const res = await fetch("http://localhost:3000/api/sync", { method: "POST" });
  console.log(await res.text());
}
triggerSync();
