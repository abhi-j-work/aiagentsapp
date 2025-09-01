import React, { useState } from 'react';

// Define the shape of the insight we expect from the backend
interface PathInsight {
    nodes: string[];
    pairs: string[][];
}

interface ChatProps {
    // This function will be called to pass the discovered path up to the parent
    onInsightFound: (insight: PathInsight) => void;
}

const Chat: React.FC<ChatProps> = ({ onInsightFound }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ user: string, text: string }[]>([]);

    const handleSend = async () => {
        if (!message.trim()) return;

        // Add user message to history
        setChatHistory(prev => [...prev, { user: 'You', text: message }]);
        setMessage('');

        // --- SIMULATE BACKEND CALL ---
        // In a real app, you would make an API call here with the message
        // For demonstration, we'll just return a hardcoded path.
        const simulateBackendResponse = async (userMessage: string): Promise<PathInsight> => {
            console.log("Simulating backend call for:", userMessage);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay

            // This is the data structure your backend should return for path highlighting
            return {
                nodes: ["Polymer Surfaces", "Contamination Control", "Metal Ions", "Wafer"],
                pairs: [
                    ["Polymer Surfaces", "Contamination Control"],
                    ["Metal Ions", "Wafer"]
                ]
            };
        };
        
        const insight = await simulateBackendResponse(message);
        
        // Add a simulated bot response to history
        setChatHistory(prev => [...prev, { user: 'Agent', text: 'I found a relevant path connecting contaminants to the wafer.' }]);

        // Pass the insight up to the parent component
        onInsightFound(insight);
    };

    return (
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div className="section-title">Chat with Research Agent</div>
            <div className="chat-history" style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '10px' }}>
                {chatHistory.map((entry, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                        <strong style={{ color: entry.user === 'You' ? '#00ffcc' : '#a78bfa' }}>{entry.user}: </strong>
                        <span>{entry.text}</span>
                    </div>
                ))}
            </div>
            <div className="chat-input" style={{ display: 'flex' }}>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about contaminants..."
                    style={{ flexGrow: 1, marginRight: '8px' }}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default Chat;