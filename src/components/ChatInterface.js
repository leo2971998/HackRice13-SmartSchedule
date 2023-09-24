import React, { useState } from 'react';
import axios from 'axios';
import '../styles/ChatInterface.css';
import userIcon from '../icons/usericon.jpg';
import botIcon from '../icons/aiicon.jpg';

const ChatInterface = () => {
    const [query, setQuery] = useState("");
    const [conversation, setConversation] = useState([]);


    const handleInputChange = (e) => {
        setQuery(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
            e.preventDefault();

        }
    };
    const handleSubmit = async () => {
        sendQuery(query);
        setQuery("");
    };

    const sendQuery = async (queryText) => {
        setConversation([...conversation, { text: queryText, type: 'user' }]);
        const response = await axios.post('http://localhost:5000/chat-query', { prompt: queryText });
        setConversation([...conversation, { text: queryText, type: 'user' }, { text: response.data.message, type: 'bot' }]);
        setQuery("");
    }

    return (
        <div className="chat-container">
            <div className="chat-title">
                AI Chat Assistant
            </div>
            <div className="chat-history">
                {conversation.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.type}`}>
                        <img src={msg.type === 'user' ? userIcon : botIcon} alt={`${msg.type} icon`} className="chat-icon" />
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className="quick-replies">
                <button className="btn btn-info" onClick={() => sendQuery("Give me the availability for the week (Starting from Mon-Fri (8:00AM to 5:00PM))")}>Check Available Schedule At Work</button>
                <button className="btn btn-info" onClick={() => sendQuery("Give me the conflicting events for the week (Starting from Mon-Fri (8:00am to 5:00pm))")}>Check Conflicted Meetings</button>
                <button className="btn btn-info" onClick={() => sendQuery("Smart suggestion for healthy life")}>Suggest Healthy Activities</button>
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}

                />
                <button class="btn btn-success" onClick={handleSubmit}>Send</button>
            </div>
        </div>
    );
};

export default ChatInterface;