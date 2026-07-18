'use client';

import React from 'react';
import Wheel from './Wheel';

interface DatePickerProps {
  initialAge?: number;
  initialDate?: Date;
  label?: string;
  maxAge?: number;
  minAge?: number;
  onChange: (date: Date, age: number) => void;
}

function ageFromDate(date: Date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

function birthDateForAge(age: number) {
  const today = new Date();
  return new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
}

export default function DatePicker({
  initialAge,
  initialDate,
  label = 'Age',
  maxAge = 99,
  minAge = 18,
  onChange,
}: DatePickerProps) {
  const initialValue = React.useMemo(() => {
    const dateAge = initialDate ? ageFromDate(initialDate) : undefined;
    const age = initialAge ?? dateAge ?? 25;
    return Math.min(Math.max(age, minAge), maxAge);
  }, [initialAge, initialDate, maxAge, minAge]);
  const [ageIndex, setAgeIndex] = React.useState(initialValue - minAge);
  const age = minAge + ageIndex;

  React.useEffect(() => {
    onChange(birthDateForAge(age), age);
  }, [age, onChange]);

  return (
    <div className="age-picker" aria-label={label}>
      <div className="age-picker__value">{age}</div>
      <div className="datepicker-container age-picker__wheel">
        <div className="datepicker-wheels">
          <Wheel
            length={maxAge - minAge + 1}
            initIdx={ageIndex}
            label={label}
            onChange={setAgeIndex}
            setValue={(index) => String(minAge + index)}
            width={112}
          />
        </div>
      </div>
    </div>
  );
}
