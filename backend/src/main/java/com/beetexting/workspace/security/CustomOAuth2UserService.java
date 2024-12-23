package com.beetexting.workspace.security;

import com.beetexting.workspace.model.User;
import com.beetexting.workspace.service.UserService;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserService userService;

    public CustomOAuth2UserService(UserService userService) {
        this.userService = userService;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        // Extract provider details
        String provider = userRequest.getClientRegistration().getRegistrationId();
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");

        // Create or update user in our system
        User user = userService.findByEmail(email)
            .orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setName(name);
                newUser.setAuthProvider(provider);
                newUser.setRole(User.UserRole.VIEWER); // Default role
                public class User {
    // Other fields and methods

    public enum UserRole {
        VIEWER,
        ADMIN,
        // other roles
    }

    private UserRole role;

    public void setRole(UserRole role) {
        this.role = role;
    }

    // Other fields and methods
}return newUser;
            });

        return new CustomOAuth2User(oauth2User, user);
    }
}
