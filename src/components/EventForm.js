import React, {useState} from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EventForm() {
    const params = new URLSearchParams(window.location.search);
    const [title, setTitle] = useState(params.get('title') || "");
    const [date, setDate] = useState(params.get('date') || new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(params.get('start') || "00:00");
    const [endTime, setEndTime] = useState(params.get('end') || "00:30");
    const eventId = params.get('id');
    const [titleError, setTitleError] = useState(false);
    const [dateError, setDateError] = useState(false);
    const [timeError, setTimeError] = useState(false);
    const notifyError = (message) => {
        toast.error(message, {
            position: "top-right",
            autoClose: 1000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
        });
    }
    const handleSave = () => {
        let isValid = true;

        if (title.trim() === "") {
            setTitleError(true);
            notifyError("Title cannot be empty");
            isValid = false;
        } else {
            setTitleError(false);
        }

        if (date === "") {
            setDateError(true);
            notifyError("Date cannot be empty");
            isValid = false;
        } else {
            setDateError(false);
        }

        if (startTime >= endTime) {
            setTimeError(true);
            notifyError("Start time should be less than end time");
            isValid = false;
        } else {
            setTimeError(false);
        }

        if (!isValid) return;
        const startUTC = moment.tz(`${date}T${startTime}`, "UTC").format();
        const endUTC = moment.tz(`${date}T${endTime}`, "UTC").format();

        const newEvent = {
            title,
            start: startUTC,
            end: endUTC
        };

        const url = eventId ? `http://localhost:5000/events/${eventId}` : 'http://localhost:5000/events';

        const method = eventId ? 'put' : 'post';

        axios[method](url, newEvent)
            .then(response => {
                window.opener.postMessage({
                    type: 'newEvent',
                    newEvent: response.data
                }, window.location.origin);
                window.close();
            })
            .catch(error => {
                console.error("Error adding or updating event:", error);
            });
    };
    const handleDelete = () => {
        if (!eventId) {
            return;
        }

        const userConfirmed = window.confirm("Are you sure you want to delete this event?");

        if (!userConfirmed) {
            return;
        }

        axios.delete(`http://localhost:5000/events/${eventId}`)
            .then(response => {
                window.opener.postMessage({
                    type: 'deleteEvent',
                    id: eventId
                }, window.location.origin);
                window.close();
            })
            .catch(error => {
                console.error("Error deleting event:", error);
            });
    };

    return (
        <div className="container">
            <ToastContainer/>
            <h2 className="my-4">{eventId ? 'Edit Event' : 'Enter Event Details'}</h2>
            <form>
                <div className="mb-3">
                    <input
                        type="text"
                        className={`form-control ${titleError ? 'border-danger' : ''}`}
                        placeholder="Event Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="date"
                        className={`form-control ${dateError ? 'border-danger' : ''}`}
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="time"
                        className={`form-control ${timeError ? 'border-danger' : ''}`}
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="time"
                        className={`form-control ${timeError ? 'border-danger' : ''}`}
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                    />
                </div>

                <button type="button" className="btn btn-success me-2" onClick={handleSave}>
                    {eventId ? 'Save Event' : 'Add Event'}
                </button>

                {eventId &&
                    <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete Event</button>}
            </form>
        </div>


    );
}

export default EventForm;