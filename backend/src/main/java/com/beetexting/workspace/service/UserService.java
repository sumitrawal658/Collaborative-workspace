package com.beetexting.workspace.service;

import com.beetexting.workspace.model.User;
import com.beetexting.workspace.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String userId = oauth2User.getAttribute("sub");
        return getUserById(userId);
    }

    public User getUserById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public User createUser(OAuth2User oauth2User, User.AuthProvider provider) {
        User user = new User();
        user.setId(oauth2User.getAttribute("sub"));
        user.setEmail(oauth2User.getAttribute("email"));
        user.setName(oauth2User.getAttribute("name"));
        user.setImageUrl(oauth2User.getAttribute("picture"));
        user.setProvider(provider);
        user.setProviderId(oauth2User.getAttribute("sub"));
        user.setEmailVerified(oauth2User.getAttribute("email_verified"));
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        return userRepository.save(user);
    }

    public User updateUser(User user) {
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }

    public void updateLastLogout(String userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        userOptional.ifPresent(user -> {
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        });
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

  public Optional<User> findByEmail(String email) {
  }
} 
