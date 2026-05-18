export function getDayNoteSections(dayTopic) {
    if (!dayTopic) return [];

    const newNotes = Array.isArray(dayTopic.new_notes) ? dayTopic.new_notes : [];
    const subTopics = Array.isArray(dayTopic.sub_topics) ? dayTopic.sub_topics : [];
    const sections = [];
    const consumedNoteIds = new Set();
    const consumedSubTopics = new Set();

    const pushSection = (section) => {
        if (!section?.markdown?.trim()) return;
        sections.push(section);
    };

    subTopics.forEach((subTopic, index) => {
        const matchingNote = newNotes.find((note) => note.sub_topic_text === subTopic.text);

        if (matchingNote) {
            if (matchingNote.id) consumedNoteIds.add(matchingNote.id);
            consumedSubTopics.add(matchingNote.sub_topic_text);

            pushSection({
                id: matchingNote.id || `day-note-${dayTopic.id}-${index}`,
                title: subTopic.text,
                markdown: matchingNote.notes_markdown,
                highlights: Array.isArray(matchingNote.highlights) ? matchingNote.highlights : [],
            });
            return;
        }

        if (index === 0 && dayTopic.generated_notes) {
            pushSection({
                id: `legacy-day-note-${dayTopic.id}`,
                title: subTopic.text,
                markdown: dayTopic.generated_notes,
                highlights: [],
            });
        }
    });

    newNotes.forEach((note, index) => {
        const alreadyIncluded = (note.id && consumedNoteIds.has(note.id)) || consumedSubTopics.has(note.sub_topic_text);
        if (alreadyIncluded) return;

        pushSection({
            id: note.id || `extra-day-note-${dayTopic.id}-${index}`,
            title: note.sub_topic_text || `Note ${index + 1}`,
            markdown: note.notes_markdown,
            highlights: Array.isArray(note.highlights) ? note.highlights : [],
        });
    });

    if (sections.length === 0 && dayTopic.generated_notes) {
        pushSection({
            id: `legacy-day-note-${dayTopic.id}`,
            title: dayTopic.topic_name || 'Study Notes',
            markdown: dayTopic.generated_notes,
            highlights: [],
        });
    }

    return sections;
}
