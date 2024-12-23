package com.workspace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.comprehend.ComprehendClient;
import software.amazon.awssdk.services.comprehend.model.*;
import com.theokanning.openai.OpenAiService;
import com.theokanning.openai.completion.CompletionRequest;
import com.workspace.model.Note;
import com.workspace.repository.NoteRepository;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NoteAnalysisService {
    
    @Autowired
    private ComprehendClient comprehendClient;
    
    @Autowired
    private OpenAiService openAiService;
    
    @Autowired
    private NoteRepository noteRepository;
    
    public void analyzeNote(String noteId) {
        Note note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
            
        // Analyze sentiment using AWS Comprehend
        DetectSentimentRequest sentimentRequest = DetectSentimentRequest.builder()
            .text(note.getContent())
            .languageCode("en")
            .build();
            
        DetectSentimentResponse sentimentResponse = comprehendClient.detectSentiment(sentimentRequest);
        note.setSentiment(sentimentResponse.sentimentAsString());
        
        // Generate tags using AWS Comprehend
        DetectKeyPhrasesRequest keyPhrasesRequest = DetectKeyPhrasesRequest.builder()
            .text(note.getContent())
            .languageCode("en")
            .build();
            
        DetectKeyPhrasesResponse keyPhrasesResponse = comprehendClient.detectKeyPhrases(keyPhrasesRequest);
        List<String> tags = keyPhrasesResponse.keyPhrases().stream()
            .map(KeyPhrase::text)
            .limit(5) // Limit to top 5 key phrases
            .collect(Collectors.toList());
        note.setTags(tags);
        
        // Generate summary using OpenAI if content is long (>500 chars)
        if (note.getContent().length() > 500) {
            CompletionRequest completionRequest = CompletionRequest.builder()
                .model("gpt-3.5-turbo")
                .prompt("Please summarize the following text in 2-3 sentences:\n\n" + note.getContent())
                .maxTokens(150)
                .temperature(0.7)
                .build();
                
            String summary = openAiService.createCompletion(completionRequest)
                .getChoices().get(0).getText().trim();
            note.setSummary(summary);
        }
        
        noteRepository.save(note);
    }
    
    public void reanalyzeAllNotes() {
        List<Note> notes = noteRepository.findAll();
        notes.forEach(note -> analyzeNote(note.getId()));
    }
} 