package com.workspace.model;

import java.time.Instant;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SecureLink {
    private String token;
    private Instant expiryTime;
} 