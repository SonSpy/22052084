require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const numberWindows = { p: [], f: [], e: [], r: [] };
let requestCount = 0;

const calculateAverage = (numbers) => {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return parseFloat((sum / numbers.length).toFixed(2));
};

const fetchNumbers = async (numberType) => {
    requestCount++;
    try {
        const endpoints = { 'p': 'primes', 'f': 'fibo', 'e': 'even', 'r': 'rand' };
        const response = await axios.get(`${process.env.TEST_SERVER_BASE_URL}/${endpoints[numberType]}`, {
            timeout: parseInt(process.env.TIMEOUT_MS),
            headers: { 'Authorization': `Bearer ${process.env.AUTH_TOKEN}` }
        });
        return response.data.numbers || [];
    } catch (error) {
        console.error(`Error fetching ${numberType} numbers:`, error.message);
        return [];
    }
};

const processNumbers = (numberType, newNumbers) => {
    const currentWindow = numberWindows[numberType];
    const windowPrevState = [...currentWindow];

    newNumbers.forEach(num => {
        if (currentWindow.length >= parseInt(process.env.WINDOW_SIZE)) {
            currentWindow.shift();
        }
        currentWindow.push(num);
    });

    if (currentWindow.length > parseInt(process.env.WINDOW_SIZE)) {
        currentWindow.splice(0, currentWindow.length - parseInt(process.env.WINDOW_SIZE));
    }

    return {
        windowPrevState,
        windowCurrState: [...currentWindow],
        numbers: newNumbers,
        avg: calculateAverage(currentWindow)
    };
};

app.get('/numbers/:numberid', async (req, res) => {
    const numberType = req.params.numberid.toLowerCase();
    if (!['p', 'f', 'e', 'r'].includes(numberType)) {
        return res.status(400).json({ error: 'Invalid number type' });
    }

    const startTime = Date.now();
    try {
        const numbers = await fetchNumbers(numberType);
        const result = processNumbers(numberType, numbers);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});