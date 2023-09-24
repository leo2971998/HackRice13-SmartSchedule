import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../styles/CalendarComponent.css';
import ChatInterface from './ChatInterface';
import moment from 'moment-timezone';
import {ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class CalendarComponent extends React.Component {
    notifySuccess = (message) => {
        toast.success(message, {
            position: "top-right",
            autoClose: 1000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
        });
    }

    constructor(props) {
        super(props);
        this.state = {
            events: [],
        };
    }

    toggleChatInterface = () => {
        this.setState(prevState => ({showChat: !prevState.showChat}));
    }

    componentDidMount() {
        window.addEventListener('message', this.handleMessage);
        axios.get('http://localhost:5000/events')
            .then(response => {
                this.setState({events: response.data});
            })
            .catch(error => {
                console.error("Error fetching events:", error);
            });
        this.forceUpdate();
    }

    componentWillUnmount() {
        window.removeEventListener('message', this.handleMessage);
    }

    handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'newEvent') {
            const newEvent = event.data.newEvent;

            const existingEventIndex = this.state.events.findIndex(e => e._id === newEvent._id);

            if (existingEventIndex !== -1) {
                this.setState(prevState => {
                    const updatedEvents = [...prevState.events];
                    updatedEvents[existingEventIndex] = newEvent;
                    return {events: updatedEvents};
                });
            } else {
                this.handleAddEvent(newEvent);
            }
        }
        if (event.data && event.data.type === 'deleteEvent') {
            const id = event.data.id;

            this.setState(prevState => ({
                events: prevState.events.filter(e => e._id !== id)
            }));
        }
    };


    handleAddEvent = (newEvent) => {
        this.setState(prevState => ({
            events: [...prevState.events, newEvent]
        }));
        if (this.popupWindow) {
            this.popupWindow.close();
        }
    };

    openEventForm = (formData) => {
        const {date, start, end, title, id} = formData;
        const width = window.outerWidth;
        const height = window.outerHeight;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;
        this.popupWindow = window.open(`/event-form?date=${date}&start=${start}&end=${end}&title=${title}&id=${id}`, 'Event Form', `width=${width},height=${height},left=${left},top=${top}`);
        window.addEventCallback = this.handleAddEvent.bind(this);
    };


    handleDateClick = (info) => {
        const view = info.view.type;

        if (view === "dayGridMonth" || !info.allDay) {
            const localDate = new Date(info.date);
            const dateISO = localDate.toISOString();
            const date = dateISO.split('T')[0];
            const startTimeStr = dateISO.split('T')[1] ? dateISO.split('T')[1].slice(0, 5) : "00:00";

            localDate.setMinutes(localDate.getMinutes() + 30);
            const endISO = localDate.toISOString();
            const endTimeStr = endISO.split('T')[1] ? endISO.split('T')[1].slice(0, 5) : "00:30";

            const formData = {date, start: startTimeStr, end: endTimeStr, title: '', id: ''};
            this.openEventForm(formData);
        }
    };
    handleEventClick = (info) => {

        const start = info.event.start.toISOString();
        const end = info.event.end.toISOString();
        const startDateStr = start.split('T')[0];
        const startTimeStr = start.split('T')[1].slice(0, 5);
        const endTimeStr = end.split('T')[1].slice(0, 5);
        const title = info.event.title;
        const id = info.event.extendedProps._id;

        const formData = {
            date: startDateStr,
            start: startTimeStr,
            end: endTimeStr,
            title,
            id
        };
        this.openEventForm(formData);
    };
    handleEventResize = (info) => {
        let event = info.event;
        let updatedEvent = {
            _id: event.extendedProps._id,
            title: event.title,
            start: event.start,
            end: event.end
        };

        const existingEventIndex = this.state.events.findIndex(e => e._id === updatedEvent._id);
        this.setState(prevState => {
            const updatedEvents = [...prevState.events];
            updatedEvents[existingEventIndex] = updatedEvent;
            return {events: updatedEvents};
        });

        this.updateEventInBackend(updatedEvent);
        this.notifySuccess("The event has been updated successfully.");
    };

    handleEventDrop = (info) => {
        let event = info.event;
        let updatedEvent = {
            _id: event.extendedProps._id,
            title: event.title,
            start: event.start,
            end: event.end
        };

        const existingEventIndex = this.state.events.findIndex(e => e._id === updatedEvent._id);
        this.setState(prevState => {
            const updatedEvents = [...prevState.events];
            updatedEvents[existingEventIndex] = updatedEvent;
            return {events: updatedEvents};
        });

        this.updateEventInBackend(updatedEvent);
        this.notifySuccess("The event has been updated successfully.");
    };
    updateEventInBackend = (event) => {
        const updatedEvent = {
            title: event.title,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
        };

        axios.put(`http://localhost:5000/events/${event._id}`, updatedEvent)
            .then(response => {
                console.log("Event updated successfully:", response.data);
            })
            .catch(error => {
                console.error("Error updating event:", error);
            });
    };

    render() {
        return (
            <div className="app-container">
                <ToastContainer/>
                <div className="calendar-container">
                    <FullCalendar
                        themeSystem={'bootstrap5'}
                        allDaySlot={false}
                        timeZone="UTC"
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'addEventButton dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        eventTimeFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            meridiem: 'short'
                        }}
                        customButtons={{
                            addEventButton: {
                                text: 'Add New Event',
                                click: () => {
                                    const currentDate = new Date();

                                    const startUTC = moment.tz(moment(currentDate).format("YYYY-MM-DDTHH:mm:ss"), "UTC").format();
                                    const endUTC = moment.tz(moment(currentDate).add(30, 'minutes').format("YYYY-MM-DDTHH:mm:ss"), "UTC").format();

                                    const date = startUTC.split('T')[0];
                                    const startTimeStr = startUTC.split('T')[1].slice(0, 5);
                                    const endTimeStr = endUTC.split('T')[1].slice(0, 5);

                                    this.openEventForm({
                                        date,
                                        start: startTimeStr,
                                        end: endTimeStr,
                                        title: '',
                                        id: ''
                                    });
                                }
                            }
                        }}
                        slotMinTime="00:00:00"
                        slotMaxTime="24:00:00"
                        slotDuration="00:30:00"
                        navLinks={true}
                        editable={true}
                        selectable={true}
                        eventLimit={true}
                        events={this.state.events}
                        dateClick={this.handleDateClick}
                        eventClick={this.handleEventClick}
                        eventResize={this.handleEventResize}
                        eventDrop={this.handleEventDrop}
                        height={'auto'}
                    />
                </div>
                <ChatInterface/>

            </div>
        );
    }
}

export default CalendarComponent;