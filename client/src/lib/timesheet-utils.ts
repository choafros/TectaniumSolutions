export function calculateHoursBetween(start: string, end: string): number {
  const startTime = new Date(`1970-01-01T${start}`);
  const endTime = new Date(`1970-01-01T${end}`);
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
}

export function calculateNormalAndOvertimeHours(
  timeSlot: { start: string; end: string },
  settings: {
    normalStartTime: string;
    normalEndTime: string;
    overtimeEndTime: string;
  }
): { normalHours: number; overtimeHours: number } {

  if (!timeSlot.start || !timeSlot.end) return { normalHours: 0, overtimeHours: 0 };

  const start = timeSlot.start;
  const end = timeSlot.end;
  const { normalStartTime, normalEndTime, overtimeEndTime } = settings;

  // Initialize hours
  let normalHours = 0;
  let overtimeHours = 0;

  // Calculate total hours worked
  const totalHours = calculateHoursBetween(start, end);

  // Calculate normal hours during normal working hours
  if (start <= normalEndTime && end >= normalStartTime) {
    const normalStart = start < settings.normalStartTime ? settings.normalStartTime : start;
    const normalEnd = end > settings.normalEndTime ? settings.normalEndTime : end;
    normalHours = calculateHoursBetween(normalStart, normalEnd);
  }

  // Calculate overtime hours
  if (end > normalEndTime && end <= overtimeEndTime) {
    overtimeHours = calculateHoursBetween(normalEndTime, end);
  }

  // Any remaining hours (outside both ranges) are counted as normal hours
  const accountedHours = normalHours + overtimeHours;
  if (accountedHours < totalHours) {
    normalHours += (totalHours - accountedHours);
  }

  return { normalHours, overtimeHours };
}
