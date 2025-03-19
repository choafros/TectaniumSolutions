export function calculateNormalAndOvertimeHours(
    timeSlot: { start: string; end: string },
    settings: {
      normalStartTime: string;
      normalEndTime: string;
      overtimeEndTime: string;
    }
  ): { normalHours: number; overtimeHours: number } {
    if (!timeSlot.start || !timeSlot.end) return { normalHours: 0, overtimeHours: 0 };
  
    const { normalStartTime, normalEndTime, overtimeEndTime } = settings;
  
    // Initialize values
    let normalHours = 0;
    let overtimeHours = 0;
  
    // Calculate total hours worked
    const totalHours = calculateHoursBetween(timeSlot.start, timeSlot.end);
  
    // Case 1: Entire shift falls within normal hours
    if (timeSlot.start >= normalStartTime && timeSlot.end <= normalEndTime) {
      normalHours = totalHours;
    }
  
    // Case 2: Entire shift falls within overtime hours
    else if (timeSlot.start >= normalEndTime && timeSlot.end <= overtimeEndTime) {
      overtimeHours = totalHours;
    }
  
    // Case 3: Shift spans both normal and overtime hours
    else {
      const overlapWithNormal = Math.max(
        0,
        calculateHoursBetween(
          Math.max(timeSlot.start, normalStartTime),
          Math.min(timeSlot.end, normalEndTime)
        )
      );
  
      const overlapWithOvertime = Math.max(
        0,
        calculateHoursBetween(
          Math.max(timeSlot.start, normalEndTime),
          Math.min(timeSlot.end, overtimeEndTime)
        )
      );
  
      normalHours = overlapWithNormal;
      overtimeHours = overlapWithOvertime;
    }
  
    return { normalHours, overtimeHours };
  }

  export function calculateHoursBetween(start: string, end: string): number {
    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);

    // Handle cases where end time crosses midnight (e.g., 22:00 - 02:00)
    if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1); // Shift to next day
    }

    // Calculate total hours with precision
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    // Round to two decimal places for better accuracy
    return Math.round(hours * 100) / 100;
  }