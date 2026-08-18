function pad(n, len) {
  return String(n).padStart(len, "0");
}

export function generateTicketId() {
  const year = new Date().getFullYear();
  const seq = pad(Math.floor(Math.random() * 9000) + 1000, 4);
  return `WO-${year}-${seq}`;
}
