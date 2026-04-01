export const isTaskCreatedInPeriod = (task: any, startDate: number, endDate: number) => {
  const created = parseInt(task.date_created);
  return created >= startDate && created <= endDate;
};

export const isTaskActiveInPeriod = (task: any, startDate: number, endDate: number) => {
  const created = parseInt(task.date_created);
  const closed = task.date_closed ? parseInt(task.date_closed) : null;

  // Task was created before the end of the period
  // AND (it is not closed OR it was closed after the start of the period)
  return created <= endDate && (closed === null || closed >= startDate);
};

export const isTaskCompletedInPeriod = (task: any, startDate: number, endDate: number) => {
  const closed = task.date_closed ? parseInt(task.date_closed) : null;
  return closed !== null && closed >= startDate && closed <= endDate;
};

export const isTaskOverdueAtEndOfPeriod = (task: any, endDate: number) => {
  const due = task.due_date ? parseInt(task.due_date) : null;
  const closed = task.date_closed ? parseInt(task.date_closed) : null;

  if (!due) return false;

  // Task is overdue if the due date is before or equal to the end of the period
  // AND it was not closed before the end of the period
  return due <= endDate && (closed === null || closed > endDate);
};

export const isTaskOnTimeAtEndOfPeriod = (task: any, endDate: number) => {
  const due = task.due_date ? parseInt(task.due_date) : null;
  const closed = task.date_closed ? parseInt(task.date_closed) : null;

  // If it has no due date, it's considered on time
  if (!due) return closed === null || closed > endDate;

  // Task is on time if the due date is after the end of the period
  // AND it was not closed before the end of the period
  return due > endDate && (closed === null || closed > endDate);
};

export const isTaskCompletedOnTimeInPeriod = (task: any, startDate: number, endDate: number) => {
  if (!isTaskCompletedInPeriod(task, startDate, endDate)) return false;
  
  const due = task.due_date ? parseInt(task.due_date) : null;
  const closed = task.date_closed ? parseInt(task.date_closed) : null;

  if (!due || !closed) return true; // No due date, so it's on time

  return closed <= due;
};
