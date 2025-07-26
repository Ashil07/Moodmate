import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PsychologistCard = ({ doctor, onBook }) => {
  const [selectedDate, setSelectedDate] = useState(null);

  return (
    <div className="border rounded-lg shadow-lg p-3 bg-white transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl max-w-sm mx-auto">
      <img
        src={doctor.image}
        alt={doctor.name}
        className="w-full h-32 object-cover rounded-md mb-3"
      />
      <h2 className="text-lg font-semibold text-gray-800">{doctor.name}</h2>
      <p className="text-sm text-indigo-600 mb-2">{doctor.specialty}</p>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">📅 Select Date</label>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="yyyy-MM-dd"
          className="border px-3 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholderText="Pick a date"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">⏰ Time Slot</label>
        <div className="flex flex-wrap gap-2">
          {doctor.slots.map((slot) => (
            <button
              key={slot}
              onClick={() => {
                if (selectedDate) {
                  const formattedDate = selectedDate.toDateString();
                  onBook(doctor.name, `${formattedDate} at ${slot}`);
                } else {
                  alert("Please select a date first.");
                }
              }}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
            >
              {slot}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PsychologistCard;