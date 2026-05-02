package com.aisched.scheduler.controller;

import com.aisched.scheduler.config.JwtAuthFilter;
import com.aisched.scheduler.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || password == null || username.isBlank() || password.length() < 4) {
            return ResponseEntity.badRequest()
                    .body(buildResponse(400, "用户名不能为空，密码至少4位", null));
        }
        var result = authService.register(username, password);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(buildResponse(201, "注册成功", result));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        var result = authService.login(username, password);
        return ResponseEntity.ok(buildResponse(200, "登录成功", result));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(buildResponse(401, "未登录", null));
        }
        var details = (JwtAuthFilter.JwtUserDetails) auth.getDetails();
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", details.getUserId());
        user.put("username", details.getUsername());
        user.put("role", details.getRole().name());
        return ResponseEntity.ok(buildResponse(200, "success", user));
    }

    private Map<String, Object> buildResponse(int code, String message, Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("data", data);
        body.put("timestamp", LocalDateTime.now().toString());
        return body;
    }
}
