'use client';

import React, { useState, useEffect } from 'react';
import Wheel from './Wheel';

interface DatePickerProps {
  initialDate?: Date;
  onChange: (date: Date, age: number) => void;
}

export default function DatePicker({ initialDate, onChange }: DatePickerProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const minYear = currentYear - 99; // 1927 for 2026
  const maxYear = currentYear - 18; // 2008 for 2026
  const yearLength = maxYear - minYear + 1;

  // Set default initial date to 2000-01-01 (approx 26 years old)
  const defaultDate = React.useMemo(() => {
    if (initialDate) {
      // Validate that initialDate is within bounds
      const y = initialDate.getFullYear();
      if (y >= minYear && y <= maxYear) return initialDate;
    }
    return new Date(2000, 0, 1);
  }, [initialDate, minYear, maxYear]);

  const [yearIdx, setYearIdx] = useState(() => {
    return defaultDate.getFullYear() - minYear;
  });
  const [monthIdx, setMonthIdx] = useState(() => {
    return defaultDate.getMonth();
  });
  const [dayIdx, setDayIdx] = useState(() => {
    return defaultDate.getDate() - 1;
  });

  const selectedYear = minYear + yearIdx;
  const selectedMonth = monthIdx + 1;
  const selectedDay = dayIdx + 1;

  // Dynamically calculate days in the selected month/year
  const daysInMonth = React.useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Adjust day index if it exceeds the max days in the newly selected month
  useEffect(() => {
    if (dayIdx >= daysInMonth) {
      setDayIdx(daysInMonth - 1);
    }
  }, [daysInMonth, dayIdx]);

  useEffect(() => {
    // Clamp the selected day to valid range
    const validDay = Math.min(selectedDay, daysInMonth);
    const date = new Date(selectedYear, selectedMonth - 1, validDay);
    
    // Dynamic Age Calculation
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    
    onChange(date, age);
  }, [yearIdx, monthIdx, dayIdx, daysInMonth]);

  return (
    <div className="datepicker-container">
      <div className="datepicker-wheels">
        <Wheel
          length={daysInMonth}
          initIdx={Math.min(dayIdx, daysInMonth - 1)}
          setValue={(i) => String(i + 1).padStart(2, '0')}
          width={70}
          onChange={setDayIdx}
          label="Day"
        />
        <Wheel
          length={12}
          initIdx={monthIdx}
          setValue={(i) => String(i + 1).padStart(2, '0')}
          width={70}
          onChange={setMonthIdx}
          label="Month"
        />
        <Wheel
          length={yearLength}
          initIdx={yearIdx}
          setValue={(i) => String(minYear + i)}
          width={90}
          onChange={setYearIdx}
          label="Year"
        />
      </div>
    </div>
  );
}
