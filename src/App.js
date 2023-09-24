import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Use Routes instead of Switch
import EventForm from './components/EventForm';
import CalendarComponent from './components/CalendarComponent';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import ChatInterface from './components/ChatInterface';
function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<CalendarComponent />} />
          <Route path="/event-form" element={<EventForm />} />
          <Route path = "/chat-interface" element = {<ChatInterface/>} />
        </Routes>
      </Router>
  );
}

export default App;