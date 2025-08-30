import { GoogleGenAI, Type } from "@google/genai";
import { ParsedFile, DataStory } from '../types';

// Ensure the environment variable is handled correctly
const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });

const storySchema = {
    type: Type.OBJECT,
    properties: {
        executiveSummary: {
            type: Type.STRING,
            description: "A high-level summary of the entire dataset, written for a business executive. Should be 2-3 sentences."
        },
        sections: {
            type: Type.ARRAY,
            description: "An array of detailed sections, each focusing on a specific insight.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "A short, descriptive title for this section's finding."
                    },
                    insight: {
                        type: Type.STRING,
                        description: "A detailed textual explanation of the finding, trend, or outlier discovered in the data. Explain what it means."
                    },
                    chart: {
                        type: Type.OBJECT,
                        description: "Data for a chart visualizing this specific insight.",
                        properties: {
                            type: {
                                type: Type.STRING,
                                description: "The suggested chart type. Must be one of: 'bar', 'pie', 'line'."
                            },
                            data: {
                                type: Type.OBJECT,
                                description: "The data needed to render the chart, following Chart.js structure.",
                                properties: {
                                    labels: {
                                        type: Type.ARRAY,
                                        description: "An array of strings for the X-axis labels (for bar/line) or pie slice labels.",
                                        items: { type: Type.STRING }
                                    },
                                    datasets: {
                                        type: Type.ARRAY,
                                        description: "An array of dataset objects.",
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                label: {
                                                    type: Type.STRING,
                                                    description: "The label for this dataset (e.g., 'Total Sales')."
                                                },
                                                data: {
                                                    type: Type.ARRAY,
                                                    description: "An array of numerical data points corresponding to the labels.",
                                                    items: { type: Type.NUMBER }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const getSampleDataAsCSV = (file: ParsedFile, maxRows = 100, maxCols = 20): string => {
    const headers = file.headers.slice(0, maxCols);
    const data = file.data.slice(0, maxRows);

    const headerRow = headers.join(',');
    const bodyRows = data.map(row => 
        headers.map(header => {
            const value = String(row[header] ?? '');
            // Simple CSV escaping
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );

    return [headerRow, ...bodyRows].join('\n');
}

export const generateDataStory = async (file: ParsedFile): Promise<DataStory> => {
    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    
    const sampleCsv = getSampleDataAsCSV(file);

    const prompt = `
        You are an expert data analyst. Your task is to analyze the following dataset and generate a compelling "data story" in JSON format.
        The story should consist of an executive summary and several sections, each highlighting a key insight.
        For each insight, you must provide a title, a textual explanation, and the necessary data to create a relevant chart (bar, pie, or line).
        The chart data must be in the specified Chart.js format.
        Analyze trends, distributions, and relationships. Focus on creating clear, actionable insights.

        Here is a sample of the data in CSV format:
        --- DATASET ---
        ${sampleCsv}
        --- END DATASET ---

        Please provide your analysis in the structured JSON format defined by the schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: storySchema,
            },
        });

        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\s*|```\s*$/g, '');

        const story = JSON.parse(cleanedJsonString) as DataStory;
        
        if (!story.executiveSummary || !Array.isArray(story.sections)) {
            throw new Error("AI response is missing required fields (executiveSummary, sections).");
        }

        return story;

    } catch (error) {
        console.error("Error generating data story from Gemini:", error);
        throw new Error("Failed to generate insights from the AI. The model may have returned an invalid format or an error occurred.");
    }
};
