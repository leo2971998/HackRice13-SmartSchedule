require('dotenv').config();
const moment = require('moment-timezone');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAIAPI = require('openai');
const axios = require('axios');
const openai = new OpenAIAPI({
    apiKey: process.env.OPENAI_API_KEY
});
const addSleepEvents = async () => {
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    const startOfWeek = new Date(currentDate);
    const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
    startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);

    for (let i = 0; i < 7; i++) {
        const sleepStart = new Date(startOfWeek);
        sleepStart.setUTCDate(startOfWeek.getUTCDate() + i);
        sleepStart.setUTCHours(22, 0, 0, 0);

        const sleepEnd = new Date(startOfWeek);
        sleepEnd.setUTCDate(startOfWeek.getUTCDate() + i + 1);
        sleepEnd.setUTCHours(7, 0, 0, 0);

        const sleepStartJsDate = new Date(sleepStart);
        const sleepEndJsDate = new Date(sleepEnd);

        const existingEvent = await Event.findOne({
            start: { $gte: sleepStartJsDate },
            end: { $lte: sleepEndJsDate },
            title: "Sleep"
        });

        if (!existingEvent) {
            const sleepEvent = new Event({ start: sleepStartJsDate, end: sleepEndJsDate, title: "Sleep" });
            await sleepEvent.save();
        }
    }
};



const app = express();

mongoose.connect('mongodb://127.0.0.1:27017/CalendarEvents', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB");
    addSleepEvents();
}).catch(error => {
    console.error("Error connecting to MongoDB:", error);
});

const eventSchema = new mongoose.Schema({
    title: String,
    start: Date,
    end: Date,
    eventDate: Date
}, { versionKey: false });

const Event = mongoose.model('Event', eventSchema);

app.use(cors());
app.use(bodyParser.json());

function getAvailableSlots(events) {
    const START_HOUR = 8;
    const END_HOUR = 17;
    const availability = {};

    const currentDate = new Date();

    currentDate.setUTCHours(0, 0, 0, 0);

    const startOfWeek = new Date(currentDate);
    const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
    startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);

    for (let i = 0; i < 5; i++) {
        const day = new Date(startOfWeek);
        day.setUTCDate(day.getUTCDate() + i);
        availability[day.getTime()] = [{ start: START_HOUR, end: END_HOUR }];
    }


    for (const event of events) {
        const eventStartDate = new Date(event.start);
        const eventEndDate = new Date(event.end);


        const eventStartHour = eventStartDate.getUTCHours() + eventStartDate.getUTCMinutes() / 60;
        const eventEndHour = eventEndDate.getUTCHours() + eventEndDate.getUTCMinutes() / 60;
        const eventDay = new Date(eventStartDate);
        eventDay.setUTCHours(0, 0, 0, 0);


        if (availability[eventDay.getTime()]) {
            const slots = availability[eventDay.getTime()];
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];

                if (eventStartHour < slot.end && eventEndHour > slot.start) {
                    if (eventStartHour > slot.start && eventEndHour < slot.end) {
                        const newSlot = { start: eventEndHour, end: slot.end };
                        slot.end = eventStartHour;
                        slots.splice(i + 1, 0, newSlot);
                    } else if (eventStartHour <= slot.start && eventEndHour >= slot.end) {
                        slots.splice(i, 1);
                        i--;
                    } else if (eventStartHour > slot.start) {
                        slot.end = eventStartHour;
                    } else if (eventEndHour < slot.end) {
                        slot.start = eventEndHour;
                    }
                }
            }
        }

    }
    return availability;
}


function getFullWeekAvailability(events) {
    const START_HOUR = 7;
    const END_HOUR = 22;
    const availability = {};

    const currentDate = new Date();

    currentDate.setUTCHours(0, 0, 0, 0);

    const startOfWeek = new Date(currentDate);
    const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
    startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);

    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        availability[day.getTime()] = [{ start: START_HOUR, end: END_HOUR }];
    }

    for (const event of events) {
        const eventStartDate = new Date(event.start);
        const eventEndDate = new Date(event.end);
        const eventStartHour = eventStartDate.getUTCHours() + eventStartDate.getUTCMinutes() / 60;
        const eventEndHour = eventEndDate.getUTCHours() + eventEndDate.getUTCMinutes() / 60;
        const eventDay = eventStartDate.setUTCHours(0, 0, 0, 0);

        if (availability[eventDay]) {
            const slots = availability[eventDay];
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                if (eventStartHour < slot.end && eventEndHour > slot.start) {
                    if (eventStartHour > slot.start && eventEndHour < slot.end) {
                        const newSlot = { start: eventEndHour, end: slot.end };
                        slot.end = eventStartHour;
                        slots.splice(i + 1, 0, newSlot);
                    } else if (eventStartHour <= slot.start && eventEndHour >= slot.end) {
                        slots.splice(i, 1);
                        i--;
                    } else if (eventStartHour > slot.start) {
                        slot.end = eventStartHour;
                    } else if (eventEndHour < slot.end) {
                        slot.start = eventEndHour;
                    }
                }
            }
        }
    }

    return availability;
}

function findConflictingEventsInWeek(events) {
    const conflicts = {};

    const currentDate = new Date();

    currentDate.setUTCHours(0, 0, 0, 0);

    const startOfWeek = new Date(currentDate);
    const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
    startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);


    for (let i = 0; i < 5; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        conflicts[day.toISOString().split('T')[0]] = [];
    }

    for (let i = 0; i < events.length; i++) {
        const eventA = events[i];
        for (let j = i + 1; j < events.length; j++) {
            const eventB = events[j];

            const startA = new Date(eventA.start);
            const endA = new Date(eventA.end);
            const startB = new Date(eventB.start);
            const endB = new Date(eventB.end);

            if (startA < endB && endA > startB) {
                const eventDay = startA.toISOString().split('T')[0];
                if (conflicts[eventDay]) {
                    conflicts[eventDay].push({ eventA, eventB });
                }
            }
        }
    }

    return conflicts;
}

app.get('/events', async (req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/events/week', async (req, res) => {
    try {
        const currentDate = new Date();

        currentDate.setUTCHours(0, 0, 0, 0);

        const startOfWeek = new Date(currentDate);
        const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
        startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
        endOfWeek.setUTCHours(23, 59, 59, 999);
        const weeklyEvents = await Event.find({
            start: { $gte: startOfWeek, $lte: endOfWeek }
        });
        res.json(weeklyEvents);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/events/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (event) {
            res.json(event);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/events', async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.json(event);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.put('/events/:id', async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (event) {
            res.json(event);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

app.delete('/events/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/chat-query', async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt) {
        return res.status(400).json({ message: "Prompt is missing" });
    }

    let userMessageContent = prompt;
    if (prompt.toLowerCase().includes("give me the availability for the week (starting from mon-fri (8:00am to 5:00pm))")) {
        try {
            const weeklyEventsResponse = await axios.get('http://localhost:5000/events/week');
            const weeklyEvents = weeklyEventsResponse.data;

            const currentDate = new Date();

            currentDate.setUTCHours(0, 0, 0, 0);

            const startOfWeek = new Date(currentDate);
            const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
            startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);

            const availability = getAvailableSlots(weeklyEvents, currentDate, startOfWeek);

            const weekStartDate = moment(startOfWeek).format('MM-DD-YYYY');

            userMessageContent = `I am looking for my availability for the week starting from ${weekStartDate}. Here's my availability: ${JSON.stringify(availability)}. Please use centered dot bullet points to print the dates, and also includes the day names (Monday, Tuesday, etc.)`;
        } catch (error) {
            console.error("Error:", error);
            res.status(500).send(error);
            return;
        }
    }


    else if (prompt.toLowerCase().includes("give me the conflicting events for the week (starting from mon-fri (8:00am to 5:00pm))")) {
        try {
            const weeklyEventsResponse = await axios.get('http://localhost:5000/events/week');
            const weeklyEvents = weeklyEventsResponse.data;

            const conflictingEvents = findConflictingEventsInWeek(weeklyEvents);

            const currentDate = new Date();

            currentDate.setUTCHours(0, 0, 0, 0);

            const startOfWeek = new Date(currentDate);
            const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
            startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);
            const weekStartDate = moment(startOfWeek).format('MM-DD-YYYY');

            userMessageContent = `I am looking for my conflicting events for the week starting from ${weekStartDate}. Here are the conflicting events: ${JSON.stringify(conflictingEvents)}. Please use centered dot bullet points to print the dates, and also include the day names (Monday, Tuesday, etc.)`;
        } catch (error) {
            console.error("Error:", error);
            res.status(500).send(error);
            return;
        }
    }
    else if (prompt.toLowerCase().includes("smart suggestion for healthy life")) {
        try {

            const weeklyEventsResponse = await axios.get('http://localhost:5000/events/week');
            const weeklyEvents = weeklyEventsResponse.data;

            const availability = getFullWeekAvailability(weeklyEvents);
            const currentDate = new Date();

            currentDate.setUTCHours(0, 0, 0, 0);

            const startOfWeek = new Date(currentDate);
            const daysToMonday = currentDate.getUTCDay() === 0 ? -6 : 1 - currentDate.getUTCDay();
            startOfWeek.setUTCDate(currentDate.getUTCDate() + daysToMonday);
            const weekStartDate = moment(startOfWeek).format('MM-DD-YYYY');

            userMessageContent = `I am looking for suggestions for a healthy lifestyle for the week starting from ${weekStartDate}. Here's my availability: ${JSON.stringify(availability)}. Please use centered dot bullet points to print the dates, and also includes the day names (Monday, Tuesday, etc.). What healthy activities would you suggest for me as a software engineer?`;
        } catch (error) {
            console.error("Error:", error);
            res.status(500).send(error);
            return;
        }
    }

    try {
        const gptResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: userMessageContent
                }
            ]
        });

        const message = gptResponse.choices[0].message.content.trim();
        res.json({ message });
    } catch (error) {
        console.error("Error communicating with GPT-3:", error);
        res.status(500).send(error);
    }
});


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});