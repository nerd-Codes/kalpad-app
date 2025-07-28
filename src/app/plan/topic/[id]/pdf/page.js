// src/app/plan/topic/[id]/pdf/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { PDFViewer } from '@react-pdf/renderer';
import { NotesPDF } from "@/components/NotesPDF";
import { Loader, Text, Center } from "@mantine/core";

export default function PDFExportPage() {
    const params = useParams();
    const { id } = params;
    const [dayTopic, setDayTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        const fetchTopicData = async () => {
            try {
                const { data, error } = await supabase
                    .from('plan_topics')
                    .select('topic_name, generated_notes')
                    .eq('id', id)
                    .single();
                
                if (error) throw error;
                if (!data) throw new Error("Topic not found.");

                setDayTopic(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTopicData();
    }, [id]);

    if (loading) {
        return <Center style={{ height: '100vh' }}><Loader /> <Text ml="md">Loading Document...</Text></Center>;
    }
    if (error) {
        return <Center style={{ height: '100vh' }}><Text color="red">Error: {error}</Text></Center>;
    }

    return (
        <PDFViewer style={{ width: '100%', height: '100vh' }}>
            <NotesPDF dayTopic={dayTopic} />
        </PDFViewer>
    );
}