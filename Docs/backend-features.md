# BudgetApp — Feature Registry

This file documents all implemented features in the BudgetApp backend API.
Each entry describes the feature's purpose, workflow, and components.

<!-- Entries are appended chronologically -->

---

## Auth — Register

**Date Added:** 2026-02-21
**Entity:** ApplicationUser
**Type:** Command
**HTTP Endpoint:** POST /api/v1/auth/register

### Description

Creates a new user account in the system. The client supplies a first name, last name, email address, and password. On success the endpoint returns no body — the caller must subsequently log in to obtain tokens. No token of any kind is issued at registration time.

### Workflow

1. Client sends `POST /api/v1/auth/register` with `{ firstName, lastName, email, password }`.
2. `AuthController.Register` receives the `RegisterRequest` record and dispatches `RegisterCommand` via MediatR.
3. `RegisterCommandValidator` validates the request — throws `ValidationException` on failure (→ 422).
4. `RegisterCommandHandler` handles the command:
   - Calls `IIdentityService.RegisterAsync(firstName, lastName, email, password)`.
   - `IdentityService.RegisterAsync` creates an `ApplicationUser` (with `UserName = email`) and calls `UserManager<ApplicationUser>.CreateAsync` with the supplied password.
   - Identity applies all configured password rules (digit, lowercase, uppercase, non-alphanumeric, minimum length 8) and enforces email uniqueness.
   - If `IdentityResult.Succeeded` is `false`, `RegisterCommandHandler` throws `DomainException` with the concatenated Identity error descriptions (→ 400).
5. Returns `Unit.Value` — controller returns HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Auth/Commands/Register/RegisterCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Auth/Commands/Register/RegisterCommandHandler.cs` | Application | Business logic handler |
| `src/BudgetApp.Application/Features/Auth/Commands/Register/RegisterCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.Application/Common/Interfaces/IIdentityService.cs` | Application | Identity service abstraction |
| `src/BudgetApp.Infrastructure/Identity/IdentityService.cs` | Infrastructure | `IIdentityService` implementation using `UserManager<ApplicationUser>` |
| `src/BudgetApp.Infrastructure/Identity/ApplicationUser.cs` | Infrastructure | ASP.NET Core Identity user entity with custom fields |
| `src/BudgetApp.API/Controllers/AuthController.cs` | API | HTTP endpoint + `RegisterRequest` input record |

### Authorization

This endpoint is decorated with `[AllowAnonymous]`. No authentication is required or checked. There is no user ownership concern — the handler creates a brand-new user row and does not access any existing user's data.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| Validation failure (empty fields, invalid email, password too short, etc.) | `ValidationException` | 422 |
| Email already registered, password fails Identity rules | `DomainException` | 400 |

### Notes

ASP.NET Core Identity password requirements are configured in `Infrastructure/DependencyInjection.cs` and enforced server-side by `UserManager`, independently of the FluentValidation rules in `RegisterCommandValidator`. The validator only enforces structural constraints (non-empty, max length 256, valid email format, minimum length 8). Stricter composition rules (digit, uppercase, etc.) are enforced by Identity and surface as a `DomainException` if violated.

---

## Auth — Login

**Date Added:** 2026-02-21
**Entity:** ApplicationUser
**Type:** Command
**HTTP Endpoint:** POST /api/v1/auth/login

### Description

Validates a user's email and password credentials and, on success, issues a JWT access token and a cryptographically random refresh token. Both tokens are returned in the response body. The refresh token is persisted to the user's `AspNetUsers` row with a 7-day expiry.

### Workflow

1. Client sends `POST /api/v1/auth/login` with `{ email, password }`.
2. `AuthController.Login` receives the `LoginRequest` record and dispatches `LoginCommand` via MediatR.
3. `LoginCommandValidator` validates the request — throws `ValidationException` on failure (→ 422).
4. `LoginCommandHandler` handles the command:
   - Calls `IIdentityService.ValidateCredentialsAsync(email, password)`, which looks up the user by email via `UserManager.FindByEmailAsync` and verifies the password via `UserManager.CheckPasswordAsync`.
   - If credentials are invalid, throws `DomainException("Invalid email or password.")` (→ 400).
   - Calls `IIdentityService.GetUserProfileAsync(userId)` to load profile data; throws `DomainException` if the account cannot be loaded.
   - Calls `ITokenService.GenerateAccessToken(userId, email)` to produce a signed HS256 JWT containing `ClaimTypes.NameIdentifier`, `ClaimTypes.Email`, `jti`, and `iat` claims. Expiry is controlled by `JwtSettings.TokenExpirationInMinutes` (default 60 minutes).
   - Calls `ITokenService.GenerateRefreshToken()` to produce a 64-byte cryptographically random Base64 string.
   - Calls `IIdentityService.SetRefreshTokenAsync(userId, refreshToken, expiry)` to persist the refresh token and its expiry (`UtcNow + 7 days`) on the `ApplicationUser` row via `UserManager.UpdateAsync`.
5. Returns `AuthTokensDto(accessToken, refreshToken)` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Auth/Commands/Login/LoginCommand.cs` | Application | MediatR request record (`IRequest<AuthTokensDto>`) |
| `src/BudgetApp.Application/Features/Auth/Commands/Login/LoginCommandHandler.cs` | Application | Business logic handler |
| `src/BudgetApp.Application/Features/Auth/Commands/Login/LoginCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.Application/Features/Auth/Commands/Login/AuthTokensDto.cs` | Application | Response DTO record (`AccessToken`, `RefreshToken`) |
| `src/BudgetApp.Application/Common/Interfaces/IIdentityService.cs` | Application | Identity service abstraction |
| `src/BudgetApp.Application/Common/Interfaces/ITokenService.cs` | Application | Token generation abstraction |
| `src/BudgetApp.Infrastructure/Identity/IdentityService.cs` | Infrastructure | Credential validation and refresh token persistence |
| `src/BudgetApp.Infrastructure/Identity/TokenService.cs` | Infrastructure | JWT and refresh token generation |
| `src/BudgetApp.Infrastructure/Identity/ApplicationUser.cs` | Infrastructure | Stores `RefreshToken` and `RefreshTokenExpiryTime` columns |
| `src/BudgetApp.Infrastructure/Settings/JwtSettings.cs` | Infrastructure | Typed settings bound from `appsettings.json` |
| `src/BudgetApp.API/Controllers/AuthController.cs` | API | HTTP endpoint + `LoginRequest` input record |

### Authorization

This endpoint is decorated with `[AllowAnonymous]`. No JWT is required to call it — this is the endpoint that issues the first token.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| Missing or malformed email/password fields | `ValidationException` | 422 |
| Email not found or password incorrect | `DomainException` | 400 |
| User account cannot be loaded after credential check | `DomainException` | 400 |

### Notes

The error message for invalid credentials is deliberately generic (`"Invalid email or password."`) to avoid revealing whether the email exists in the system. The response body for a successful login is:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<base64-string>"
}
```

---

## Auth — Refresh Token

**Date Added:** 2026-02-21
**Entity:** ApplicationUser
**Type:** Command
**HTTP Endpoint:** POST /api/v1/auth/refresh

### Description

Exchanges a valid, unexpired refresh token for a new JWT access token and a new refresh token. This implements token rotation: the old refresh token is replaced atomically, making it impossible to reuse a consumed token. Clients should call this endpoint before their access token expires to maintain a seamless session.

### Workflow

1. Client sends `POST /api/v1/auth/refresh` with `{ userId, refreshToken }`.
2. `AuthController.Refresh` receives the `RefreshRequest` record and dispatches `RefreshTokenCommand` via MediatR.
3. `RefreshTokenCommandValidator` validates the request — throws `ValidationException` on failure (→ 422).
4. `RefreshTokenCommandHandler` handles the command:
   - Calls `IIdentityService.ValidateRefreshTokenAsync(userId, refreshToken)`, which looks up the `ApplicationUser` by `userId` and checks that the stored `RefreshToken` matches and `RefreshTokenExpiryTime > UtcNow`.
   - If validation fails (token mismatch, expired, user not found), throws `DomainException("Refresh token is invalid or has expired.")` (→ 400).
   - Calls `IIdentityService.GetUserProfileAsync(userId)` to load email for the new access token; throws `DomainException` if account cannot be loaded.
   - Calls `ITokenService.GenerateAccessToken` and `ITokenService.GenerateRefreshToken` to produce a new token pair.
   - Calls `IIdentityService.SetRefreshTokenAsync` to overwrite the stored refresh token and its expiry (`UtcNow + 7 days`), invalidating the old token.
5. Returns `AuthTokensDto(newAccessToken, newRefreshToken)` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Auth/Commands/RefreshToken/RefreshTokenCommand.cs` | Application | MediatR request record (`IRequest<AuthTokensDto>`) |
| `src/BudgetApp.Application/Features/Auth/Commands/RefreshToken/RefreshTokenCommandHandler.cs` | Application | Business logic handler |
| `src/BudgetApp.Application/Features/Auth/Commands/RefreshToken/RefreshTokenCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.Application/Features/Auth/Commands/Login/AuthTokensDto.cs` | Application | Shared response DTO record (reused from Login) |
| `src/BudgetApp.Application/Common/Interfaces/IIdentityService.cs` | Application | Identity service abstraction |
| `src/BudgetApp.Application/Common/Interfaces/ITokenService.cs` | Application | Token generation abstraction |
| `src/BudgetApp.Infrastructure/Identity/IdentityService.cs` | Infrastructure | Refresh token validation and rotation |
| `src/BudgetApp.Infrastructure/Identity/TokenService.cs` | Infrastructure | JWT and refresh token generation |
| `src/BudgetApp.Infrastructure/Identity/ApplicationUser.cs` | Infrastructure | Stores `RefreshToken` and `RefreshTokenExpiryTime` |
| `src/BudgetApp.API/Controllers/AuthController.cs` | API | HTTP endpoint + `RefreshRequest` input record |

### Authorization

This endpoint is decorated with `[AllowAnonymous]`. The caller authenticates implicitly by providing the `userId` + `refreshToken` pair. No Bearer token is required, which allows token refresh even after an access token has already expired.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| Empty `userId` or `refreshToken` fields | `ValidationException` | 422 |
| Token does not match stored token, token is expired, or user not found | `DomainException` | 400 |
| User account cannot be loaded after token validation | `DomainException` | 400 |

### Notes

The system stores only one refresh token per user (directly on the `ApplicationUser` row). Every successful refresh replaces the previous token, so only the most recently issued refresh token is ever valid. This is intentional for a single-device personal finance application; it does not support concurrent sessions across multiple devices.

---

## Auth — Revoke Token

**Date Added:** 2026-02-21
**Entity:** ApplicationUser
**Type:** Command
**HTTP Endpoint:** POST /api/v1/auth/revoke

### Description

Invalidates the refresh token of the currently authenticated user, effectively logging them out. After revocation, any subsequent attempt to call the refresh endpoint with the old token will be rejected. The access token itself remains valid until its natural expiry since JWTs are stateless and not tracked server-side.

### Workflow

1. Client sends `POST /api/v1/auth/revoke` with an `Authorization: Bearer <access_token>` header. No request body is required.
2. `AuthController.Revoke` dispatches `RevokeTokenCommand` (a parameter-less record) via MediatR.
3. No validator is registered for `RevokeTokenCommand` — the command carries no input fields.
4. `RevokeTokenCommandHandler` handles the command:
   - Reads `_currentUser.UserId` from `ICurrentUserService` (extracted from `ClaimTypes.NameIdentifier` in the validated JWT).
   - If `UserId` is null, throws `ForbiddenException("User is not authenticated.")` (→ 403).
   - Calls `IIdentityService.ClearRefreshTokenAsync(userId)`, which sets `RefreshToken = null` and `RefreshTokenExpiryTime = null` on the `ApplicationUser` row via `UserManager.UpdateAsync`.
5. Returns `Unit.Value` — controller returns HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Auth/Commands/RevokeToken/RevokeTokenCommand.cs` | Application | MediatR request record (`IRequest<Unit>`, no parameters) |
| `src/BudgetApp.Application/Features/Auth/Commands/RevokeToken/RevokeTokenCommandHandler.cs` | Application | Business logic handler |
| `src/BudgetApp.Application/Common/Interfaces/IIdentityService.cs` | Application | Identity service abstraction |
| `src/BudgetApp.Application/Common/Interfaces/ICurrentUserService.cs` | Application | Current user abstraction |
| `src/BudgetApp.Infrastructure/Identity/IdentityService.cs` | Infrastructure | Refresh token clearing via `UserManager` |
| `src/BudgetApp.Infrastructure/Identity/ApplicationUser.cs` | Infrastructure | Nullified `RefreshToken` and `RefreshTokenExpiryTime` columns |
| `src/BudgetApp.API/Controllers/AuthController.cs` | API | HTTP endpoint (no request body) |

### Authorization

This endpoint requires a valid Bearer token (`[Authorize]`). The JWT middleware validates the token before the request reaches the controller. The handler additionally guards against a null `UserId` as a defence-in-depth check, throwing `ForbiddenException` (→ 403) if the claim is missing.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token in request | 401 (ASP.NET Core JWT middleware, before handler) | 401 |
| `UserId` claim is absent despite a valid token | `ForbiddenException` | 403 |

### Notes

Revoking only nullifies the refresh token. The access token issued at login remains cryptographically valid until it expires (governed by `JwtSettings.TokenExpirationInMinutes`). For short-lived access tokens this is an acceptable trade-off; a token block-list would be required if immediate invalidation of the access token is needed.

---

## Auth — Get Current User Profile

**Date Added:** 2026-02-21
**Entity:** ApplicationUser
**Type:** Query
**HTTP Endpoint:** GET /api/v1/auth/me

### Description

Returns the profile of the currently authenticated user. This is a lightweight endpoint that allows clients to retrieve user identity information (id, first name, last name, email) after login, without requiring the user to provide their credentials again. Only the authenticated user's own profile is ever returned.

### Workflow

1. Client sends `GET /api/v1/auth/me` with an `Authorization: Bearer <access_token>` header.
2. `AuthController.GetMe` dispatches `GetMeQuery` (a parameter-less record) via MediatR.
3. No validator is registered for `GetMeQuery` — the query carries no input fields.
4. `GetMeQueryHandler` handles the query:
   - Reads `_currentUser.UserId` from `ICurrentUserService`.
   - If `UserId` is null, throws `ForbiddenException("User is not authenticated.")` (→ 403).
   - Calls `IIdentityService.GetUserProfileAsync(userId)`, which looks up the `ApplicationUser` via `UserManager.FindByIdAsync` and projects it to `UserProfileDto`.
   - If the user cannot be found, throws `NotFoundException("User", userId)` (→ 404).
5. Returns `UserProfileDto(id, firstName, lastName, email)` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Auth/Queries/GetMe/GetMeQuery.cs` | Application | MediatR request record (`IRequest<UserProfileDto>`, no parameters) |
| `src/BudgetApp.Application/Features/Auth/Queries/GetMe/GetMeQueryHandler.cs` | Application | Query handler |
| `src/BudgetApp.Application/Common/Models/UserProfileDto.cs` | Application | Shared response DTO record (`Id`, `FirstName`, `LastName`, `Email`) |
| `src/BudgetApp.Application/Common/Interfaces/IIdentityService.cs` | Application | Identity service abstraction |
| `src/BudgetApp.Application/Common/Interfaces/ICurrentUserService.cs` | Application | Current user abstraction |
| `src/BudgetApp.Infrastructure/Identity/IdentityService.cs` | Infrastructure | `GetUserProfileAsync` via `UserManager<ApplicationUser>` |
| `src/BudgetApp.API/Controllers/AuthController.cs` | API | HTTP endpoint |

### Authorization

This endpoint requires a valid Bearer token (`[Authorize]`). The JWT middleware validates the token before the request reaches the controller. The handler reads `UserId` from `ICurrentUserService` and throws `ForbiddenException` if the claim is absent. Users can only ever retrieve their own profile — the query always resolves the user from the token, never from a caller-supplied identifier.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token in request | 401 (ASP.NET Core JWT middleware, before handler) | 401 |
| `UserId` claim is absent despite a valid token | `ForbiddenException` | 403 |
| User ID from token does not resolve to an existing `ApplicationUser` | `NotFoundException` | 404 |

### Notes

`UserProfileDto` is a shared record in `Common/Models/` rather than living under the `Auth/Queries/GetMe/` folder. This is because the same DTO is also used by `IIdentityService.GetUserProfileAsync`, which is called in multiple handlers (`LoginCommandHandler`, `RefreshTokenCommandHandler`, `GetMeQueryHandler`). Placing it in `Common/Models/` avoids circular dependencies between feature folders and the interface layer.

---

## Categories — Get Categories

**Date Added:** 2026-03-22
**Entity:** Category
**Type:** Query
**HTTP Endpoint:** GET /api/v1/categories

### Description

Returns the merged list of all system-wide categories (shared across every user) and the authenticated user's own custom categories. The response supports optional filtering by `CategoryType` and can optionally include inactive categories via the `includeInactive` flag. Results are ordered with system categories first, then user-defined categories, both sorted alphabetically by name.

### Workflow

1. Client sends `GET /api/v1/categories` with optional query parameters `categoryType` (enum) and `includeInactive` (bool, default `false`).
2. `CategoriesController.GetAll` receives the parameters and dispatches `GetCategoriesQuery(categoryType, includeInactive)` via MediatR.
3. No validator is registered for `GetCategoriesQuery` — the query carries only optional filter parameters with safe defaults.
4. `GetCategoriesQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Builds an EF Core `AsNoTracking` query filtering `c.IsSystem || c.UserId == userId`.
   - If `IncludeInactive` is `false`, further filters to `c.IsActive == true`.
   - If `CategoryType` has a value, further filters to `c.CategoryType == request.CategoryType.Value`.
   - Orders results by `!c.IsSystem` (system categories first), then by `c.Name` ascending.
   - Projects each row to `CategoryDto` and executes via `ToListAsync`.
5. Returns `List<CategoryDto>` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Categories/Queries/GetCategories/GetCategoriesQuery.cs` | Application | MediatR request record (`IRequest<List<CategoryDto>>`) |
| `src/BudgetApp.Application/Features/Categories/Queries/GetCategories/GetCategoriesQueryHandler.cs` | Application | Query handler with filtering and projection logic |
| `src/BudgetApp.Application/Features/Categories/Queries/GetCategories/CategoryDto.cs` | Application | Shared response DTO record (`Id`, `Name`, `CategoryType`, `Icon`, `Color`, `IsSystem`, `IsActive`, `CreatedAt`) |
| `src/BudgetApp.API/Controllers/CategoriesController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token (`[Authorize]` on the controller class). The handler enforces visibility by filtering the query to `c.IsSystem || c.UserId == userId` — users never see other users' private categories. System categories are visible to all authenticated users.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |

### Notes

The `IncludeInactive` flag defaults to `false`, meaning inactive categories are hidden unless explicitly requested. This supports soft-disable scenarios where a user has retired a category but historical transactions referencing it still exist. System categories also respect the `IsActive` flag, so a system category can be hidden from the list without being deleted.

---

## Categories — Get Category By ID

**Date Added:** 2026-03-22
**Entity:** Category
**Type:** Query
**HTTP Endpoint:** GET /api/v1/categories/{id}

### Description

Returns a single category by its GUID. Both system categories and the authenticated user's own custom categories are accessible. Attempting to retrieve another user's private category is rejected with a 403. This endpoint is also used as the target of the `CreatedAtAction` redirect returned by the Create endpoint.

### Workflow

1. Client sends `GET /api/v1/categories/{id}` with a valid GUID path parameter.
2. `CategoriesController.GetById` receives the `id` and dispatches `GetCategoryByIdQuery(id)` via MediatR.
3. No validator is registered for `GetCategoryByIdQuery`.
4. `GetCategoryByIdQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the category via `AsNoTracking().FirstOrDefaultAsync(c => c.Id == request.Id)`; throws `NotFoundException("Category", id)` if not found (→ 404).
   - If the category is not a system category and `category.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Projects the entity to `CategoryDto`.
5. Returns `CategoryDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Categories/Queries/GetCategoryById/GetCategoryByIdQuery.cs` | Application | MediatR request record (`IRequest<CategoryDto>`) |
| `src/BudgetApp.Application/Features/Categories/Queries/GetCategoryById/GetCategoryByIdQueryHandler.cs` | Application | Query handler with ownership check |
| `src/BudgetApp.Application/Features/Categories/Queries/GetCategories/CategoryDto.cs` | Application | Shared response DTO record (defined in GetCategories, reused here) |
| `src/BudgetApp.API/Controllers/CategoriesController.cs` | API | HTTP endpoint (named route `GetById` for `CreatedAtAction`) |

### Authorization

Requires a valid Bearer token. System categories (`IsSystem == true`) are accessible to any authenticated user. Private categories are accessible only to the owning user — the handler throws `ForbiddenException` if `!category.IsSystem && category.UserId != userId`.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Category ID not found | `NotFoundException` | 404 |
| Category belongs to a different user | `ForbiddenException` | 403 |

---

## Categories — Create Category

**Date Added:** 2026-03-22
**Entity:** Category
**Type:** Command
**HTTP Endpoint:** POST /api/v1/categories

### Description

Creates a new user-defined category for the authenticated user. The caller supplies a name, category type, and optional icon and color. Name uniqueness is enforced within the user's own categories (system category names are excluded from this check). Newly created categories are always set to `IsSystem = false` and `IsActive = true`.

### Workflow

1. Client sends `POST /api/v1/categories` with `{ name, categoryType, icon?, color? }`.
2. `CategoriesController.Create` receives a `CreateCategoryRequest` record and dispatches `CreateCategoryCommand(name, categoryType, icon, color)` via MediatR.
3. `CreateCategoryCommandValidator` validates the request — throws `ValidationException` on failure (→ 422). Rules enforced:
   - `Name`: non-empty, max 100 characters.
   - `CategoryType`: must be a valid enum value.
   - `Icon` (when provided): max 50 characters.
   - `Color` (when provided): max 7 characters, must match `^#[0-9A-Fa-f]{6}$`.
4. `CreateCategoryCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Checks for a duplicate name among the user's non-system categories: `AnyAsync(c => !c.IsSystem && c.UserId == userId && c.Name == request.Name)`. Throws `DomainException("A category with this name already exists.")` if true (→ 400).
   - Constructs a new `Category` entity with `UserId = userId`, `IsSystem = false`, `IsActive = true`, and the provided fields.
   - Calls `_context.Categories.Add(category)` and `_context.SaveChangesAsync(ct)`.
5. Returns the new `Guid` — HTTP `201 Created` with a `Location` header pointing to `GET /api/v1/categories/{id}`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Categories/Commands/CreateCategory/CreateCategoryCommand.cs` | Application | MediatR request record (`IRequest<Guid>`) |
| `src/BudgetApp.Application/Features/Categories/Commands/CreateCategory/CreateCategoryCommandHandler.cs` | Application | Business logic handler with uniqueness check and entity creation |
| `src/BudgetApp.Application/Features/Categories/Commands/CreateCategory/CreateCategoryCommandValidator.cs` | Application | FluentValidation rules including hex color regex |
| `src/BudgetApp.API/Controllers/CategoriesController.cs` | API | HTTP endpoint + `CreateCategoryRequest` input record |

### Authorization

Requires a valid Bearer token. Any authenticated user may create a category. The created category is automatically scoped to the calling user via `UserId = _currentUser.UserId`. Users can never create system categories — `IsSystem` is hardcoded to `false` in the handler.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| `Name` empty, too long, invalid `CategoryType`, malformed `Color` | `ValidationException` | 422 |
| Category with the same name already exists for this user | `DomainException` | 400 |

### Notes

The name uniqueness check is deliberately scoped to `!c.IsSystem && c.UserId == userId`. This means a user may create a category with the same name as a system category. The `Color` regex enforces exactly `#RRGGBB` format (uppercase or lowercase hex digits, exactly 6 digits after `#`), validated client-side but enforced here as the authoritative rule.

---

## Categories — Update Category

**Date Added:** 2026-03-22
**Entity:** Category
**Type:** Command
**HTTP Endpoint:** PUT /api/v1/categories/{id}

### Description

Replaces all mutable fields of an existing user-defined category. The caller can update the name, category type, icon, color, and active status. System categories are immutable and will always be rejected with a 403. Name uniqueness is re-checked when the name is being changed, scoped to the user's own non-system categories and excluding the category being updated.

### Workflow

1. Client sends `PUT /api/v1/categories/{id}` with `{ name, categoryType, icon?, color?, isActive }`.
2. `CategoriesController.Update` receives the GUID path parameter and an `UpdateCategoryRequest` record, then dispatches `UpdateCategoryCommand(id, name, categoryType, icon, color, isActive)` via MediatR.
3. `UpdateCategoryCommandValidator` validates the request — throws `ValidationException` on failure (→ 422). Rules enforced:
   - `Id`: non-empty GUID.
   - `Name`: non-empty, max 100 characters.
   - `CategoryType`: must be a valid enum value.
   - `Icon` (when provided): max 50 characters.
   - `Color` (when provided): max 7 characters, must match `^#[0-9A-Fa-f]{6}$`.
4. `UpdateCategoryCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the category via `FirstOrDefaultAsync(c => c.Id == request.Id)`; throws `NotFoundException("Category", id)` if not found (→ 404).
   - If `category.IsSystem` is `true`, throws `ForbiddenException("System categories cannot be modified.")` (→ 403).
   - If `category.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - If `request.Name != category.Name`, checks for a duplicate name: `AnyAsync(c => !c.IsSystem && c.UserId == userId && c.Name == request.Name && c.Id != request.Id)`. Throws `DomainException("A category with this name already exists.")` if true (→ 400).
   - Updates `Name`, `CategoryType`, `Icon`, `Color`, and `IsActive` on the tracked entity.
   - Calls `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Categories/Commands/UpdateCategory/UpdateCategoryCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Categories/Commands/UpdateCategory/UpdateCategoryCommandHandler.cs` | Application | Business logic handler with ownership, system-category, and uniqueness guards |
| `src/BudgetApp.Application/Features/Categories/Commands/UpdateCategory/UpdateCategoryCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/CategoriesController.cs` | API | HTTP endpoint + `UpdateCategoryRequest` input record |

### Authorization

Requires a valid Bearer token. System categories are blocked at the handler level regardless of the caller's identity (`ForbiddenException` with message `"System categories cannot be modified."`). For user-defined categories the handler verifies `category.UserId == userId`, rejecting any cross-user modification with `ForbiddenException`.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty name, invalid enum, malformed color, etc.) | `ValidationException` | 422 |
| Category ID not found | `NotFoundException` | 404 |
| Category is a system category | `ForbiddenException` | 403 |
| Category belongs to a different user | `ForbiddenException` | 403 |
| Renamed to a name that already exists for this user | `DomainException` | 400 |

### Notes

The duplicate-name check only runs when the name is actually changing (`request.Name != category.Name`). This avoids a redundant database round-trip when a client submits a PUT with the same name as the existing record. The `Id` field validated by `UpdateCategoryCommandValidator` refers to the GUID in the command record; the controller always overwrites it from the URL path parameter, so there is no risk of a mismatch between path and body IDs.

---

## Categories — Delete Category

**Date Added:** 2026-03-22
**Entity:** Category
**Type:** Command
**HTTP Endpoint:** DELETE /api/v1/categories/{id}

### Description

Permanently removes a user-defined category. The deletion is guarded by two referential integrity checks: the category must not be assigned to any budget (via `BudgetCategory`) and must have no associated transactions. System categories are always blocked from deletion. Deletion is a hard delete — there is no soft-delete path for categories.

### Workflow

1. Client sends `DELETE /api/v1/categories/{id}` with the category GUID as a path parameter.
2. `CategoriesController.Delete` receives the `id` and dispatches `DeleteCategoryCommand(id)` via MediatR.
3. No validator is registered for `DeleteCategoryCommand` — the command carries only a single `Guid Id` with no additional rules.
4. `DeleteCategoryCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the category via `FirstOrDefaultAsync(c => c.Id == request.Id)`; throws `NotFoundException("Category", id)` if not found (→ 404).
   - If `category.IsSystem` is `true`, throws `ForbiddenException("System categories cannot be deleted.")` (→ 403).
   - If `category.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Checks `_context.BudgetCategories.AnyAsync(bc => bc.CategoryId == request.Id)`. Throws `DomainException("Cannot delete a category that is assigned to one or more budgets.")` if true (→ 400).
   - Checks `_context.Transactions.AnyAsync(t => t.CategoryId == request.Id)`. Throws `DomainException("Cannot delete a category that has existing transactions.")` if true (→ 400).
   - Calls `_context.Categories.Remove(category)` and `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Categories/Commands/DeleteCategory/DeleteCategoryCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Categories/Commands/DeleteCategory/DeleteCategoryCommandHandler.cs` | Application | Business logic handler with system-category, ownership, and referential integrity guards |
| `src/BudgetApp.API/Controllers/CategoriesController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. System categories are blocked unconditionally. For user-defined categories the handler verifies `category.UserId == userId` before the referential integrity checks, ensuring a 403 is returned rather than revealing whether cross-user delete would succeed.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Category ID not found | `NotFoundException` | 404 |
| Category is a system category | `ForbiddenException` | 403 |
| Category belongs to a different user | `ForbiddenException` | 403 |
| Category is assigned to one or more budgets | `DomainException` | 400 |
| Category has existing transactions | `DomainException` | 400 |

### Notes

The two referential integrity checks (budget assignment and transactions) are executed as separate `AnyAsync` calls rather than a combined query. This provides distinct, actionable error messages so the client knows exactly which constraint was violated. The ordering of guards — system check, then ownership check, then referential checks — is intentional: authorization failures are surfaced before data-state failures, avoiding information leakage about data that belongs to other users.

---

## Budgets — Get Budgets

**Date Added:** 2026-03-22
**Entity:** Budget
**Type:** Query
**HTTP Endpoint:** GET /api/v1/budgets

### Description

Returns the list of all budgets belonging to the authenticated user. Supports optional filtering by `BudgetType` enum, a `from` date (excludes budgets whose end date is before the given date), and a `to` date (excludes budgets whose start date is after the given date). Results are ordered by `StartDate` descending (most recent first). No pagination is applied.

### Workflow

1. Client sends `GET /api/v1/budgets` with optional query parameters `budgetType` (enum), `from` (DateOnly), and `to` (DateOnly).
2. `BudgetsController.GetAll` receives the parameters and dispatches `GetBudgetsQuery(budgetType, from, to)` via MediatR.
3. No validator is registered for `GetBudgetsQuery` — all parameters are optional with no structural constraints.
4. `GetBudgetsQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Starts with `_context.Budgets.Where(b => b.UserId == userId)`.
   - If `BudgetType` has a value, appends `.Where(b => b.BudgetType == request.BudgetType.Value)`.
   - If `From` has a value, appends `.Where(b => b.EndDate >= request.From.Value)`.
   - If `To` has a value, appends `.Where(b => b.StartDate <= request.To.Value)`.
   - Orders by `b.StartDate` descending.
   - Projects each row to `BudgetSummaryDto` (including `b.BudgetCategories.Count` as `CategoryCount`) and executes via `ToListAsync`.
5. Returns `List<BudgetSummaryDto>` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgets/GetBudgetsQuery.cs` | Application | MediatR request record (`IRequest<List<BudgetSummaryDto>>`) |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgets/GetBudgetsQueryHandler.cs` | Application | Query handler with optional filtering and ordering |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgets/BudgetSummaryDto.cs` | Application | Response DTO record (`Id`, `Name`, `StartDate`, `EndDate`, `BudgetType`, `TotalIncomePlanned`, `TotalExpensesPlanned`, `TotalSavingsPlanned`, `CategoryCount`, `CreatedAt`) |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token (`[Authorize]` on the controller class). The handler filters all queries strictly to `b.UserId == userId`, so a user can never retrieve another user's budgets, even by manipulating filter parameters.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |

### Notes

The `From`/`To` date filter uses an overlap semantic: `From` constrains via `EndDate >= From` and `To` constrains via `StartDate <= To`. Together these return any budget whose date range overlaps the requested window, rather than requiring the budget to be fully contained within it.

---

## Budgets — Get Budget By ID

**Date Added:** 2026-03-22
**Entity:** Budget
**Type:** Query
**HTTP Endpoint:** GET /api/v1/budgets/{id}

### Description

Returns the full detail of a single budget identified by its GUID, including all associated budget categories with their planned amounts, notes, and resolved category metadata. This endpoint serves as the `CreatedAtAction` target for the Create and Add Category endpoints.

### Workflow

1. Client sends `GET /api/v1/budgets/{id}` with a GUID path parameter.
2. `BudgetsController.GetById` receives the `id` and dispatches `GetBudgetByIdQuery(id)` via MediatR.
3. No validator is registered for `GetBudgetByIdQuery`.
4. `GetBudgetByIdQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the budget via `Include(b => b.BudgetCategories).ThenInclude(bc => bc.Category).FirstOrDefaultAsync(b => b.Id == request.Id)`; throws `NotFoundException("Budget", id)` if not found (→ 404).
   - If `budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Projects `BudgetCategories` to a `List<BudgetCategoryDto>` in memory, then constructs and returns `BudgetDetailDto`.
5. Returns `BudgetDetailDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetById/GetBudgetByIdQuery.cs` | Application | MediatR request record (`IRequest<BudgetDetailDto>`) |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetById/GetBudgetByIdQueryHandler.cs` | Application | Query handler with eager loading and ownership check |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetById/BudgetDetailDto.cs` | Application | Response DTO records — `BudgetDetailDto` (`Id`, `Name`, `StartDate`, `EndDate`, `BudgetType`, planned totals, `Categories`, `CreatedAt`, `UpdatedAt`) and nested `BudgetCategoryDto` (`Id`, `CategoryId`, `CategoryName`, `CategoryType`, `PlannedAmount`, `Notes`) |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint (named route `GetById` for `CreatedAtAction`) |

### Authorization

Requires a valid Bearer token. After the not-found check, the handler verifies `budget.UserId == userId`, throwing `ForbiddenException` if the budget belongs to another user. The not-found check runs first to avoid revealing the existence of another user's budget via a 403 vs 404 distinction.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Budget ID not found | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |

---

## Budgets — Get Budget Summary

**Date Added:** 2026-03-22
**Entity:** Budget
**Type:** Query
**HTTP Endpoint:** GET /api/v1/budgets/{id}/summary

### Description

Returns a planned-vs-actual financial report for a specific budget. The report aggregates all transactions on the budget by `TransactionType` to compute income, expense, and net savings actuals, and breaks down the delta between planned and actual amounts per budget category. Net savings actual is calculated as `SavingsDeposit` total minus `SavingsWithdrawal` total. Variance per category is defined as `PlannedAmount - ActualAmount`.

### Workflow

1. Client sends `GET /api/v1/budgets/{id}/summary` with the budget GUID as a path parameter.
2. `BudgetsController.GetSummary` dispatches `GetBudgetSummaryQuery(id)` via MediatR.
3. No validator is registered for `GetBudgetSummaryQuery`.
4. `GetBudgetSummaryQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the budget via `Include(b => b.BudgetCategories).ThenInclude(bc => bc.Category).FirstOrDefaultAsync(b => b.Id == request.BudgetId)`; throws `NotFoundException("Budget", budgetId)` if not found (→ 404).
   - If `budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Executes a second database query: groups all transactions for the budget by `(CategoryId, TransactionType)` and sums `Amount` per group via `ToListAsync`.
   - In memory: sums the group totals to produce `incomeActual` (Income), `expenseActual` (Expense), and `savingsActual` (SavingsDeposit total − SavingsWithdrawal total).
   - Builds a per-category dictionary; for `SavingsWithdrawal` entries the contribution is negated before summing.
   - Maps each `BudgetCategory` to a `CategoryActualDto` using the dictionary (defaulting to `0` if no transactions exist) and computes `Variance = PlannedAmount - ActualAmount`.
5. Returns `BudgetSummaryReportDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetSummary/GetBudgetSummaryQuery.cs` | Application | MediatR request record (`IRequest<BudgetSummaryReportDto>`) |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetSummary/GetBudgetSummaryQueryHandler.cs` | Application | Query handler with two-phase DB fetch and in-memory aggregation |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetSummary/BudgetSummaryReportDto.cs` | Application | Response DTO records — `BudgetSummaryReportDto` (budget-level planned/actual totals and `CategoryBreakdown`) and `CategoryActualDto` (`BudgetCategoryId`, `CategoryId`, `CategoryName`, `PlannedAmount`, `ActualAmount`, `Variance`) |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership is enforced after the not-found check: `budget.UserId != userId` throws `ForbiddenException`. Transaction data is scoped to the budget ID, which is already owned by the user, so no additional cross-user data exposure is possible.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Budget ID not found | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |

### Notes

The handler issues two database round-trips: one for the budget with its categories (via EF `Include`), and one for the transaction aggregation (via `GroupBy` pushed to SQL). The per-category actual amount dictionary is built after the transaction query returns, so the grouping and variance calculation happen in application memory. Categories with no transactions receive an `ActualAmount` of `0` and a `Variance` equal to their `PlannedAmount`.

---

## Budgets — Create Budget

**Date Added:** 2026-03-22
**Entity:** Budget
**Type:** Command
**HTTP Endpoint:** POST /api/v1/budgets

### Description

Creates a new budget for the authenticated user. The caller supplies a name, start and end dates, a budget type, and three top-level planned amount totals (income, expenses, savings). Categories are added separately via the Add Budget Category endpoint. On success, the new budget's ID is returned with a `Location` header pointing to the detail endpoint.

### Workflow

1. Client sends `POST /api/v1/budgets` with `{ name, startDate, endDate, budgetType, totalIncomePlanned, totalExpensesPlanned, totalSavingsPlanned }`.
2. `BudgetsController.Create` receives a `CreateBudgetRequest` record and dispatches `CreateBudgetCommand(name, startDate, endDate, budgetType, totalIncomePlanned, totalExpensesPlanned, totalSavingsPlanned)` via MediatR.
3. `CreateBudgetCommandValidator` validates the request — throws `ValidationException` on failure (→ 422). Rules enforced:
   - `Name`: non-empty, max 200 characters.
   - `StartDate`: must not be the default `DateOnly` value.
   - `EndDate`: must be strictly after `StartDate`.
   - `BudgetType`: must be a valid enum value.
   - `TotalIncomePlanned`, `TotalExpensesPlanned`, `TotalSavingsPlanned`: each must be `>= 0`.
4. `CreateBudgetCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Constructs a new `Budget` entity with all supplied fields and `UserId = userId`.
   - Calls `_context.Budgets.Add(budget)` and `_context.SaveChangesAsync(ct)`.
5. Returns the new `Guid` — HTTP `201 Created` with a `Location` header pointing to `GET /api/v1/budgets/{id}`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/CreateBudget/CreateBudgetCommand.cs` | Application | MediatR request record (`IRequest<Guid>`) |
| `src/BudgetApp.Application/Features/Budgets/Commands/CreateBudget/CreateBudgetCommandHandler.cs` | Application | Business logic handler |
| `src/BudgetApp.Application/Features/Budgets/Commands/CreateBudget/CreateBudgetCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint + `CreateBudgetRequest` input record |

### Authorization

Requires a valid Bearer token. Any authenticated user may create a budget. The created budget is automatically scoped to the calling user via `UserId = _currentUser.UserId`. There is no uniqueness constraint on budget names — a user may have multiple budgets with the same name.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty name, name > 200 chars, invalid dates, negative amounts, invalid enum) | `ValidationException` | 422 |

---

## Budgets — Update Budget

**Date Added:** 2026-03-22
**Entity:** Budget
**Type:** Command
**HTTP Endpoint:** PUT /api/v1/budgets/{id}

### Description

Replaces all mutable fields of an existing budget. Every field — name, start date, end date, budget type, and all three planned amount totals — is updated in a single operation. The budget must belong to the authenticated user. No partial update semantics are supported; all fields must be supplied.

### Workflow

1. Client sends `PUT /api/v1/budgets/{id}` with `{ name, startDate, endDate, budgetType, totalIncomePlanned, totalExpensesPlanned, totalSavingsPlanned }`.
2. `BudgetsController.Update` receives the GUID path parameter and an `UpdateBudgetRequest` record, then dispatches `UpdateBudgetCommand(id, name, startDate, endDate, budgetType, totalIncomePlanned, totalExpensesPlanned, totalSavingsPlanned)` via MediatR.
3. `UpdateBudgetCommandValidator` validates the request — throws `ValidationException` on failure (→ 422). Rules are identical to `CreateBudgetCommandValidator` with the addition of `Id` must be non-empty.
4. `UpdateBudgetCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the budget via `_context.Budgets.FindAsync([request.Id])`; throws `NotFoundException("Budget", id)` if not found (→ 404).
   - If `budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Updates all seven mutable fields on the tracked entity and calls `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudget/UpdateBudgetCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudget/UpdateBudgetCommandHandler.cs` | Application | Business logic handler |
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudget/UpdateBudgetCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint + `UpdateBudgetRequest` input record |

### Authorization

Requires a valid Bearer token. Ownership is enforced after the not-found check: `budget.UserId != userId` throws `ForbiddenException`. The controller always reads the budget ID from the URL path parameter, not from the request body, so there is no risk of a caller substituting a different budget ID in the body.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty name, name > 200 chars, invalid dates, negative amounts, invalid enum) | `ValidationException` | 422 |
| Budget ID not found | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |

---

## Budgets — Delete Budget

**Date Added:** 2026-03-22
**Entity:** Budget
**Type:** Command
**HTTP Endpoint:** DELETE /api/v1/budgets/{id}

### Description

Permanently deletes a budget and all associated data (budget categories cascade via database FK). The operation is a hard delete. Deletion is blocked if the budget has any existing transactions, protecting transactional history integrity. Budget categories with no linked transactions are removed as part of the cascade; they do not need to be removed individually first.

### Workflow

1. Client sends `DELETE /api/v1/budgets/{id}` with the budget GUID as a path parameter.
2. `BudgetsController.Delete` dispatches `DeleteBudgetCommand(id)` via MediatR.
3. No validator is registered for `DeleteBudgetCommand` — the command carries only a single `Guid Id`.
4. `DeleteBudgetCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the budget via `Include(b => b.Transactions).FirstOrDefaultAsync(b => b.Id == request.Id)`; throws `NotFoundException("Budget", id)` if not found (→ 404).
   - If `budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - If `budget.Transactions.Count > 0`, throws `DomainException("Cannot delete a budget that has existing transactions.")` (→ 400).
   - Calls `_context.Budgets.Remove(budget)` and `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/DeleteBudget/DeleteBudgetCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Budgets/Commands/DeleteBudget/DeleteBudgetCommandHandler.cs` | Application | Business logic handler with transaction guard and hard delete |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership check (`budget.UserId != userId`) runs before the transaction guard, so a user cannot determine whether another user's budget has transactions by attempting a delete.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Budget ID not found | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |
| Budget has one or more existing transactions | `DomainException` | 400 |

### Notes

The handler loads `Transactions` via `Include` to evaluate the count in a single query rather than issuing a separate `AnyAsync` check. The `BudgetCategory` rows are not loaded explicitly because EF Core will cascade-delete them at the database level when the `Budget` row is removed, as configured by the FK relationship.

---

## Budgets — Add Budget Category

**Date Added:** 2026-03-22
**Entity:** BudgetCategory
**Type:** Command
**HTTP Endpoint:** POST /api/v1/budgets/{id}/categories

### Description

Links an existing category to a budget with a planned monetary amount and optional free-text notes. The category must either be a system category or belong to the authenticated user. Adding the same category twice to the same budget is rejected. On success, the new `BudgetCategory` record's ID is returned.

### Workflow

1. Client sends `POST /api/v1/budgets/{id}/categories` with `{ categoryId, plannedAmount, notes? }`.
2. `BudgetsController.AddCategory` receives the budget GUID from the path and an `AddBudgetCategoryRequest` record, then dispatches `AddBudgetCategoryCommand(budgetId, categoryId, plannedAmount, notes)` via MediatR.
3. `AddBudgetCategoryCommandValidator` validates the request — throws `ValidationException` on failure (→ 422). Rules enforced:
   - `BudgetId`: non-empty GUID.
   - `CategoryId`: non-empty GUID.
   - `PlannedAmount`: must be `>= 0`.
   - `Notes` (when provided): max 1000 characters.
4. `AddBudgetCategoryCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the budget via `_context.Budgets.FindAsync([request.BudgetId])`; throws `NotFoundException("Budget", budgetId)` if not found (→ 404).
   - If `budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Fetches the category via `_context.Categories.FindAsync([request.CategoryId])`; throws `NotFoundException("Category", categoryId)` if not found (→ 404).
   - If `!category.IsSystem && category.UserId != userId`, throws `ForbiddenException("You do not have access to this category.")` (→ 403).
   - Checks for a duplicate via `_context.BudgetCategories.AnyAsync(bc => bc.BudgetId == budgetId && bc.CategoryId == categoryId)`; throws `DomainException("This category is already added to the budget.")` if true (→ 400).
   - Constructs a new `BudgetCategory` entity and calls `_context.BudgetCategories.Add(budgetCategory)` and `_context.SaveChangesAsync(ct)`.
5. Returns the new `BudgetCategory` `Guid` — HTTP `201 Created` with a `Location` header pointing to `GET /api/v1/budgets/{id}`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/AddBudgetCategory/AddBudgetCategoryCommand.cs` | Application | MediatR request record (`IRequest<Guid>`) |
| `src/BudgetApp.Application/Features/Budgets/Commands/AddBudgetCategory/AddBudgetCategoryCommandHandler.cs` | Application | Business logic handler with multi-entity ownership and uniqueness checks |
| `src/BudgetApp.Application/Features/Budgets/Commands/AddBudgetCategory/AddBudgetCategoryCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint + `AddBudgetCategoryRequest` input record |

### Authorization

Requires a valid Bearer token. Two ownership checks are applied: the budget must belong to the calling user, and the category must either be a system category (`IsSystem == true`) or belong to the calling user. Both checks are enforced by the handler before the uniqueness check, so no data about other users' resources is leaked through error response differences.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty GUIDs, negative amount, notes > 1000 chars) | `ValidationException` | 422 |
| Budget ID not found | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |
| Category ID not found | `NotFoundException` | 404 |
| Category belongs to a different user and is not a system category | `ForbiddenException` | 403 |
| Category already linked to this budget | `DomainException` | 400 |

---

## Budgets — Update Budget Category

**Date Added:** 2026-03-22
**Entity:** BudgetCategory
**Type:** Command
**HTTP Endpoint:** PUT /api/v1/budgets/{id}/categories/{catId}

### Description

Updates the `PlannedAmount` and `Notes` of an existing budget-category link. The `BudgetCategory` record is located by both the budget ID and the budget-category record ID to prevent cross-budget mutations. Ownership is verified via the budget's `UserId` loaded through an `Include` navigation, avoiding an extra query.

### Workflow

1. Client sends `PUT /api/v1/budgets/{id}/categories/{catId}` with `{ plannedAmount, notes? }`.
2. `BudgetsController.UpdateCategory` receives the budget GUID and budget-category GUID from the path and an `UpdateBudgetCategoryRequest` record, then dispatches `UpdateBudgetCategoryCommand(budgetId, catId, plannedAmount, notes)` via MediatR.
3. `UpdateBudgetCategoryCommandValidator` validates the request — throws `ValidationException` on failure (→ 422). Rules enforced:
   - `BudgetId`: non-empty GUID.
   - `BudgetCategoryId`: non-empty GUID.
   - `PlannedAmount`: must be `>= 0`.
   - `Notes` (when provided): max 1000 characters.
4. `UpdateBudgetCategoryCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches `BudgetCategory` via `Include(bc => bc.Budget).FirstOrDefaultAsync(bc => bc.Id == request.BudgetCategoryId && bc.BudgetId == request.BudgetId)`; throws `NotFoundException("BudgetCategory", budgetCategoryId)` if not found (→ 404).
   - If `budgetCategory.Budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Updates `PlannedAmount` and `Notes` on the tracked entity and calls `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudgetCategory/UpdateBudgetCategoryCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudgetCategory/UpdateBudgetCategoryCommandHandler.cs` | Application | Business logic handler using `Include` for ownership verification |
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudgetCategory/UpdateBudgetCategoryCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint + `UpdateBudgetCategoryRequest` input record |

### Authorization

Requires a valid Bearer token. The handler loads the `Budget` navigation property via `Include` to read `Budget.UserId` without issuing a second query. Ownership is verified on the parent budget — the user does not need to separately "own" the `BudgetCategory` row because that row is always owned transitively through the budget.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty GUIDs, negative amount, notes > 1000 chars) | `ValidationException` | 422 |
| Budget category not found (wrong `catId` or `catId`/`id` mismatch) | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |

---

## Budgets — Remove Budget Category

**Date Added:** 2026-03-22
**Entity:** BudgetCategory
**Type:** Command
**HTTP Endpoint:** DELETE /api/v1/budgets/{id}/categories/{catId}

### Description

Removes a category link from a budget. The operation is blocked if any transactions exist for the given category within the given budget, preserving transactional history integrity. Ownership is verified via the budget's `UserId` loaded through an `Include` navigation property, consistent with the Update Budget Category handler.

### Workflow

1. Client sends `DELETE /api/v1/budgets/{id}/categories/{catId}` with the budget GUID and budget-category GUID as path parameters.
2. `BudgetsController.RemoveCategory` dispatches `RemoveBudgetCategoryCommand(budgetId, catId)` via MediatR.
3. No validator is registered for `RemoveBudgetCategoryCommand` — the command carries only two `Guid` fields.
4. `RemoveBudgetCategoryCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches `BudgetCategory` via `Include(bc => bc.Budget).FirstOrDefaultAsync(bc => bc.Id == request.BudgetCategoryId && bc.BudgetId == request.BudgetId)`; throws `NotFoundException("BudgetCategory", budgetCategoryId)` if not found (→ 404).
   - If `budgetCategory.Budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Checks `_context.Transactions.AnyAsync(t => t.BudgetId == request.BudgetId && t.CategoryId == budgetCategory.CategoryId)`; throws `DomainException("Cannot remove a budget category that has existing transactions.")` if true (→ 400).
   - Calls `_context.BudgetCategories.Remove(budgetCategory)` and `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/RemoveBudgetCategory/RemoveBudgetCategoryCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Budgets/Commands/RemoveBudgetCategory/RemoveBudgetCategoryCommandHandler.cs` | Application | Business logic handler with transaction guard |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership is checked before the transaction guard, ensuring a user cannot determine whether another user's budget category has transactions by attempting a remove. The transaction check is scoped to both `BudgetId` and `CategoryId` to avoid false positives from the same category used in different budgets.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Budget category not found (wrong `catId` or `catId`/`id` mismatch) | `NotFoundException` | 404 |
| Budget belongs to a different user | `ForbiddenException` | 403 |
| Transactions exist for this category within this budget | `DomainException` | 400 |

### Notes

The `RemoveBudgetCategoryCommand` record uses the field name `BudgetCategoryId` (not `CategoryId`) to refer to the `BudgetCategory` primary key. The URL path parameter is named `catId` in the controller. The handler resolves `CategoryId` for the transaction check from the loaded `budgetCategory.CategoryId` navigation property, not from the command — this avoids any ambiguity between the join-table PK and the referenced `Category` PK.
---

## Transactions — Get Transactions

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Query
**HTTP Endpoint:** GET /api/v1/transactions

### Description

Returns a flat list of all transactions belonging to the authenticated user. The caller may supply up to seven independent optional filters: budget, category, transaction type, date range (from/to), and amount range (min/max). Results are ordered by `TransactionDate` descending, then `CreatedAt` descending, giving a chronological view of recent activity first. This query is the primary list view used to browse spending and income across one or all budgets.

### Workflow

1. Client sends `GET /api/v1/transactions` with any combination of optional query parameters: `budgetId`, `categoryId`, `transactionType`, `from`, `to`, `minAmount`, `maxAmount`.
2. `TransactionsController.GetAll` receives the query parameters and dispatches `GetTransactionsQuery` via MediatR.
3. `GetTransactionsQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Builds a base `IQueryable<Transaction>` filtered by `t.UserId == userId`.
   - If `BudgetId` is supplied: verifies the budget exists and belongs to the user via `_context.Budgets.AnyAsync(...)`, throwing `NotFoundException("Budget", budgetId)` if not (→ 404); then appends a `Where(t => t.BudgetId == ...)` clause.
   - Appends each remaining filter (`CategoryId`, `TransactionType`, `From`, `To`, `MinAmount`, `MaxAmount`) only when the corresponding parameter has a value.
   - Executes a single projected `SELECT` via `.Select(t => new TransactionDto(...))` with EF Core navigation to `t.Budget.Name` and `t.Category.Name`/`t.Category.CategoryType`.
   - Orders by `TransactionDate` desc, `CreatedAt` desc.
4. Returns `List<TransactionDto>` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactions/GetTransactionsQuery.cs` | Application | MediatR request record (`IRequest<List<TransactionDto>>`) |
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactions/GetTransactionsQueryHandler.cs` | Application | Filter-composition and projection handler |
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactions/TransactionDto.cs` | Application | List-view response record |
| `src/BudgetApp.API/Controllers/TransactionsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. The base query is always scoped to `t.UserId == _currentUser.UserId`, so a user can never receive another user's transactions regardless of the filters supplied. The optional `budgetId` filter additionally verifies ownership of the budget via `b.UserId == userId` before filtering, preventing enumeration of transactions in other users' budgets.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| `budgetId` filter supplied but budget not found or belongs to another user | `NotFoundException` | 404 |

### Notes

There is no server-side pagination. The full result set is returned for the matching filters. The `TransactionDto` uses EF Core navigation properties (`t.Budget.Name`, `t.Category.Name`, `t.Category.CategoryType`) projected directly in the LINQ `Select`, avoiding a separate round-trip. The `CategoryId` filter does not perform an ownership check on the category — it is treated as a plain equality predicate against the user's already-scoped transaction rows.

---

## Transactions — Get Transaction By Id

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Query
**HTTP Endpoint:** GET /api/v1/transactions/{id}

### Description

Returns the full detail record for a single transaction identified by its GUID. The response shape is `TransactionDetailDto`, which extends the list-view fields with `UpdatedAt`, allowing clients to display the last-modified timestamp. The handler uses explicit `Include` calls to eagerly load the associated budget and category navigation properties.

### Workflow

1. Client sends `GET /api/v1/transactions/{id}`.
2. `TransactionsController.GetById` receives the route parameter `id` and dispatches `GetTransactionByIdQuery(id)` via MediatR.
3. `GetTransactionByIdQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Calls `_context.Transactions.Include(t => t.Budget).Include(t => t.Category).FirstOrDefaultAsync(t => t.Id == request.Id && t.UserId == userId, ct)`.
   - If the result is null (transaction not found, or belongs to another user), throws `NotFoundException("Transaction", id)` (→ 404).
   - Projects the loaded entity into `TransactionDetailDto`.
4. Returns `TransactionDetailDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactionById/GetTransactionByIdQuery.cs` | Application | MediatR request record (`IRequest<TransactionDetailDto>`) |
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactionById/GetTransactionByIdQueryHandler.cs` | Application | Single-entity fetch handler with eager loading |
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactionById/TransactionDetailDto.cs` | Application | Detail-view response record (includes `UpdatedAt`) |
| `src/BudgetApp.API/Controllers/TransactionsController.cs` | API | HTTP endpoint; named route `"GetTransactionById"` used by `CreatedAtAction` in Create |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the database query level: the `FirstOrDefaultAsync` predicate combines `t.Id == request.Id` with `t.UserId == userId`. A transaction that exists but belongs to another user is indistinguishable from a non-existent transaction — both produce a `NotFoundException` (→ 404), preventing existence disclosure.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Transaction not found or belongs to another user | `NotFoundException` | 404 |

---

## Transactions — Get Transaction Summary

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Query
**HTTP Endpoint:** GET /api/v1/transactions/summary

### Description

Returns an aggregate financial summary for the authenticated user's transactions, optionally scoped to a specific budget, date range, and/or transaction type. The summary includes total income, total expenses, total savings deposits, total savings withdrawals, derived net savings (`SavingsDeposit - SavingsWithdrawal`), derived net cash flow (`Income - Expense`), a total transaction count, and a by-category breakdown ordered by total descending. This is the primary analytics endpoint for dashboard-style views.

### Workflow

1. Client sends `GET /api/v1/transactions/summary` with optional query parameters: `budgetId`, `from`, `to`, `transactionType`.
2. `TransactionsController.GetSummary` receives the parameters and dispatches `GetTransactionSummaryQuery` via MediatR.
3. `GetTransactionSummaryQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Builds a base `IQueryable<Transaction>` scoped to `t.UserId == userId`.
   - If `BudgetId` is supplied: verifies budget ownership via `_context.Budgets.AnyAsync(b => b.Id == budgetId && b.UserId == userId)`; throws `NotFoundException("Budget", budgetId)` if not found (→ 404); appends `Where(t => t.BudgetId == ...)`.
   - Applies `From`, `To`, and `TransactionType` filters where provided.
   - Executes a `GroupBy(_ => 1)` aggregate query to compute `TotalIncome`, `TotalExpenses`, `TotalSavingsDeposits`, `TotalSavingsWithdrawals`, and `Count` in a single database round-trip.
   - Executes a second query grouping by `(CategoryId, Category.Name, Category.CategoryType)` to produce the `ByCategory` breakdown, ordered by `Total` descending.
   - Derives `NetSavings` and `NetCashFlow` in-memory; defaults all totals to `0m` if the aggregate returns null (no matching transactions).
4. Returns `TransactionSummaryDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactionSummary/GetTransactionSummaryQuery.cs` | Application | MediatR request record (`IRequest<TransactionSummaryDto>`) |
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactionSummary/GetTransactionSummaryQueryHandler.cs` | Application | Two-pass aggregate and by-category grouping handler |
| `src/BudgetApp.Application/Features/Transactions/Queries/GetTransactionSummary/TransactionSummaryDto.cs` | Application | Summary response record; also defines `TransactionSummaryByCategoryDto` |
| `src/BudgetApp.API/Controllers/TransactionsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. The base query is always scoped to `t.UserId == _currentUser.UserId`. If `budgetId` is supplied, the handler additionally verifies budget ownership before narrowing the query scope, consistent with the GetTransactions pattern.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| `budgetId` supplied but budget not found or belongs to another user | `NotFoundException` | 404 |

### Notes

When no transactions match the applied filters, the handler returns a `TransactionSummaryDto` with all monetary fields set to `0m`, `TransactionCount` set to `0`, and an empty `ByCategory` list — it never throws a not-found error for an empty result set. The `NetSavings` and `NetCashFlow` fields are computed in C# after the database round-trip, not in SQL, keeping the aggregate query simple. The `GetTransactionSummaryQuery` does not support `CategoryId` or amount-range filters (unlike `GetTransactionsQuery`) — it is intended as a high-level aggregate view.

---

## Transactions — Create Transaction

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Command
**HTTP Endpoint:** POST /api/v1/transactions

### Description

Creates a new transaction record for the authenticated user. The caller must supply a budget, a category, a positive amount, a transaction type, a description, and a date. The handler enforces that the category is already assigned to the budget (via the `BudgetCategories` join table) and that the transaction date falls within the budget's `StartDate`-`EndDate` period. On success the new transaction's GUID is returned and a `Location` header pointing to the detail endpoint is set.

### Workflow

1. Client sends `POST /api/v1/transactions` with `{ budgetId, categoryId, amount, transactionType, description, transactionDate, notes? }`.
2. `TransactionsController.Create` receives `CreateTransactionRequest` and dispatches `CreateTransactionCommand` via MediatR.
3. `CreateTransactionCommandValidator` validates the request — throws `ValidationException` on failure (→ 422):
   - `BudgetId` and `CategoryId` must be non-empty GUIDs.
   - `Amount` must be greater than 0.
   - `TransactionType` must be a valid enum value.
   - `Description` must be non-empty and <= 500 characters.
   - `TransactionDate` must not be the default `DateOnly` value.
   - `Notes`, when provided, must be <= 2000 characters.
4. `CreateTransactionCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Loads the budget via `_context.Budgets.FindAsync([request.BudgetId])`; throws `NotFoundException("Budget", budgetId)` if not found (→ 404).
   - If `budget.UserId != userId`, throws `ForbiddenException()` (→ 403).
   - Loads the category via `_context.Categories.FindAsync([request.CategoryId])`; throws `NotFoundException("Category", categoryId)` if not found (→ 404).
   - If `!category.IsSystem && category.UserId != userId`, throws `ForbiddenException("You do not have access to this category.")` (→ 403).
   - Verifies the category is assigned to the budget via `_context.BudgetCategories.AnyAsync(bc => bc.BudgetId == ... && bc.CategoryId == ...)`; throws `DomainException("The category is not assigned to this budget.")` if not (→ 400).
   - Validates `request.TransactionDate` is within `[budget.StartDate, budget.EndDate]`; throws `DomainException(...)` with the period in the message if not (→ 400).
   - Constructs a `Transaction` entity and calls `_context.Transactions.Add(transaction)` followed by `_context.SaveChangesAsync(ct)`.
5. Returns the new transaction `Guid` — controller returns HTTP `201 Created` with `Location: /api/v1/transactions/{id}`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Transactions/Commands/CreateTransaction/CreateTransactionCommand.cs` | Application | MediatR request record (`IRequest<Guid>`) |
| `src/BudgetApp.Application/Features/Transactions/Commands/CreateTransaction/CreateTransactionCommandHandler.cs` | Application | Business logic handler with budget/category/date guards |
| `src/BudgetApp.Application/Features/Transactions/Commands/CreateTransaction/CreateTransactionCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/TransactionsController.cs` | API | HTTP endpoint; `CreateTransactionRequest` input record defined in same file |

### Authorization

Requires a valid Bearer token. The handler independently verifies ownership of the budget and accessibility of the category before persisting the transaction. System categories (`IsSystem == true`) are available to all authenticated users; user-created categories are only accessible when `category.UserId == _currentUser.UserId`.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| Validation failure (missing fields, amount <= 0, description too long, etc.) | `ValidationException` | 422 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Budget not found | `NotFoundException` | 404 |
| Budget belongs to another user | `ForbiddenException` | 403 |
| Category not found | `NotFoundException` | 404 |
| Category belongs to another user (and is not a system category) | `ForbiddenException` | 403 |
| Category not assigned to the specified budget | `DomainException` | 400 |
| Transaction date outside the budget's period | `DomainException` | 400 |

---

## Transactions — Update Transaction

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Command
**HTTP Endpoint:** PUT /api/v1/transactions/{id}

### Description

Updates the mutable fields of an existing transaction: category, amount, transaction type, description, transaction date, and notes. The `BudgetId` is intentionally immutable — it is not accepted in the request body. If a caller needs to move a transaction to a different budget, the existing transaction must be deleted and a new one created. All the same category-assignment and date-range business rules that apply on creation are re-enforced on update whenever the category or date changes.

### Workflow

1. Client sends `PUT /api/v1/transactions/{id}` with `{ categoryId, amount, transactionType, description, transactionDate, notes? }`.
2. `TransactionsController.Update` receives the route `id` and `UpdateTransactionRequest` body, then dispatches `UpdateTransactionCommand(id, ...)` via MediatR.
3. `UpdateTransactionCommandValidator` validates the command — throws `ValidationException` on failure (→ 422):
   - `Id` must be a non-empty GUID.
   - Same rules as create for `CategoryId`, `Amount`, `TransactionType`, `Description`, `TransactionDate`, and `Notes`.
4. `UpdateTransactionCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Loads the transaction via `_context.Transactions.FirstOrDefaultAsync(t => t.Id == request.Id && t.UserId == userId)`; throws `NotFoundException("Transaction", id)` if null (→ 404).
   - Loads the associated budget via `_context.Budgets.FindAsync([transaction.BudgetId])`; throws `NotFoundException("Budget", budgetId)` if not found (→ 404). Verifies `budget.UserId == userId`; throws `ForbiddenException()` if not (→ 403).
   - If `request.CategoryId != transaction.CategoryId` (category is being changed): loads the new category, verifies accessibility (`IsSystem || category.UserId == userId`), and verifies the new category is assigned to the budget via `BudgetCategories.AnyAsync(...)`. Throws `NotFoundException`, `ForbiddenException`, or `DomainException` as appropriate.
   - Validates `request.TransactionDate` is within `[budget.StartDate, budget.EndDate]`; throws `DomainException(...)` if not (→ 400).
   - Applies field mutations directly on the tracked entity and calls `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Transactions/Commands/UpdateTransaction/UpdateTransactionCommand.cs` | Application | MediatR request record (`IRequest<Unit>`); no `BudgetId` field by design |
| `src/BudgetApp.Application/Features/Transactions/Commands/UpdateTransaction/UpdateTransactionCommandHandler.cs` | Application | Business logic handler; conditionally re-validates category only when it changes |
| `src/BudgetApp.Application/Features/Transactions/Commands/UpdateTransaction/UpdateTransactionCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/TransactionsController.cs` | API | HTTP endpoint; `UpdateTransactionRequest` input record defined in same file |

### Authorization

Requires a valid Bearer token. The transaction query is scoped to `t.UserId == userId`, ensuring a user cannot update another user's transaction. Budget ownership is re-verified after loading the parent budget, providing defence-in-depth. Category access follows the same system-vs-user-owned rule as `CreateTransaction`.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| Validation failure | `ValidationException` | 422 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Transaction not found or belongs to another user | `NotFoundException` | 404 |
| Associated budget not found | `NotFoundException` | 404 |
| Budget belongs to another user | `ForbiddenException` | 403 |
| New category not found | `NotFoundException` | 404 |
| New category belongs to another user (and is not a system category) | `ForbiddenException` | 403 |
| New category not assigned to the budget | `DomainException` | 400 |
| Transaction date outside the budget's period | `DomainException` | 400 |

### Notes

The category validation block is conditionally executed only when `request.CategoryId != transaction.CategoryId`. If the category is unchanged, only the date-range check is re-applied. This avoids redundant database round-trips on updates that only change amount, description, or notes.

---

## Transactions — Delete Transaction

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Command
**HTTP Endpoint:** DELETE /api/v1/transactions/{id}

### Description

Permanently removes a single transaction from the system. This is a hard delete with no soft-delete or archiving behaviour. Unlike the budget delete operation, there are no dependency guards — a transaction is a leaf entity in the data model and has no children that reference it. On success the endpoint returns no body.

### Workflow

1. Client sends `DELETE /api/v1/transactions/{id}`.
2. `TransactionsController.Delete` receives the route parameter `id` and dispatches `DeleteTransactionCommand(id)` via MediatR.
3. `DeleteTransactionCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Loads the transaction via `_context.Transactions.FirstOrDefaultAsync(t => t.Id == request.Id && t.UserId == userId, ct)`; throws `NotFoundException("Transaction", id)` if null (→ 404).
   - Calls `_context.Transactions.Remove(transaction)` and `_context.SaveChangesAsync(ct)`.
4. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Transactions/Commands/DeleteTransaction/DeleteTransactionCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/Transactions/Commands/DeleteTransaction/DeleteTransactionCommandHandler.cs` | Application | Hard-delete handler; no dependency guards |
| `src/BudgetApp.API/Controllers/TransactionsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the query level (`t.UserId == userId`), meaning a transaction belonging to another user is indistinguishable from a non-existent one — both produce a `NotFoundException` (→ 404). There is no separate `ForbiddenException` path for wrong-user access on this handler.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Transaction not found or belongs to another user | `NotFoundException` | 404 |

### Notes

There is no validator for `DeleteTransactionCommand` because the only input is the route `Guid id`, which is validated implicitly by ASP.NET Core's model binding (`{id:guid}` route constraint). This is an accepted pattern in this codebase for single-parameter delete commands where the route constraint provides sufficient structural validation.

---

## Savings Goals — Get Savings Goals

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Query
**HTTP Endpoint:** GET /api/v1/savings-goals

### Description

Returns all savings goals belonging to the authenticated user, ordered by creation date descending. Supports three optional query filters: goal status, a lower-bound target date, and an upper-bound target date. The `ProgressPercentage` field is computed inline as part of the EF Core projection and is capped at 100.

### Workflow

1. Client sends `GET /api/v1/savings-goals` with optional query parameters `status`, `targetDateFrom`, and `targetDateTo`.
2. `SavingsGoalsController.GetAll` receives the parameters and dispatches `GetSavingsGoalsQuery(status, targetDateFrom, targetDateTo)` via MediatR.
3. No validator is registered for `GetSavingsGoalsQuery`.
4. `GetSavingsGoalsQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Builds a composable `IQueryable<SavingsGoal>` filtered to `g.UserId == userId`.
   - If `Status` has a value, appends `.Where(g => g.Status == request.Status.Value)`.
   - If `TargetDateFrom` has a value, appends `.Where(g => g.TargetDate == null || g.TargetDate >= request.TargetDateFrom.Value)`.
   - If `TargetDateTo` has a value, appends `.Where(g => g.TargetDate == null || g.TargetDate <= request.TargetDateTo.Value)`.
   - Orders by `g.CreatedAt` descending.
   - Projects each row to `SavingsGoalSummaryDto`, computing `ProgressPercentage` as `Math.Min(100m, CurrentAmount / TargetAmount * 100m)` (0 when `TargetAmount == 0`), and executes via `ToListAsync`.
5. Returns `List<SavingsGoalSummaryDto>` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoals/GetSavingsGoalsQuery.cs` | Application | MediatR request record (`IRequest<List<SavingsGoalSummaryDto>>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoals/GetSavingsGoalsQueryHandler.cs` | Application | Query handler with optional filtering and ordering |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoals/SavingsGoalSummaryDto.cs` | Application | Response DTO record (`Id`, `Name`, `TargetAmount`, `CurrentAmount`, `ProgressPercentage`, `TargetDate?`, `Description?`, `Status`, `ContributionCount`, `CreatedAt`) |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token (`[Authorize]` on the controller class). The handler filters all queries strictly to `g.UserId == userId`, so a user can never retrieve another user's goals, even by manipulating filter parameters. Goals with a null `TargetDate` pass through both date-range filters without being excluded.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |

### Notes

Goals with no `TargetDate` are preserved in results regardless of `TargetDateFrom` or `TargetDateTo` filter values. The filter predicates explicitly allow `g.TargetDate == null` as a pass-through condition, treating an absent target date as "no deadline" that is never excluded by a date range.

---

## Savings Goals — Get Savings Goal By ID

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Query
**HTTP Endpoint:** GET /api/v1/savings-goals/{id}

### Description

Returns the complete detail of a single savings goal, including its full contribution history with resolved budget names. Contributions are ordered by `ContributionDate` descending. The handler eagerly loads contributions via `Include` / `ThenInclude` in a single database round-trip. This endpoint also serves as the `CreatedAtAction` target for the Create Savings Goal and Add Contribution endpoints.

### Workflow

1. Client sends `GET /api/v1/savings-goals/{id}` with a GUID path parameter.
2. `SavingsGoalsController.GetById` receives `id` and dispatches `GetSavingsGoalByIdQuery(id)` via MediatR.
3. No validator is registered for `GetSavingsGoalByIdQuery`.
4. `GetSavingsGoalByIdQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the goal via `Include(g => g.Contributions).ThenInclude(c => c.Budget).FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == userId, ct)`; throws `NotFoundException("SavingsGoal", id)` if null (→ 404).
   - Computes `ProgressPercentage` (`Math.Min(100m, CurrentAmount / TargetAmount * 100m)`) and `RemainingAmount` (`Math.Max(0m, TargetAmount - CurrentAmount)`) in memory.
   - Projects contributions (ordered by `ContributionDate` descending) to `List<ContributionDto>`, resolving `c.Budget?.Name` as `BudgetName`.
   - Constructs and returns `SavingsGoalDetailDto`.
5. Returns `SavingsGoalDetailDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalById/GetSavingsGoalByIdQuery.cs` | Application | MediatR request record (`IRequest<SavingsGoalDetailDto>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalById/GetSavingsGoalByIdQueryHandler.cs` | Application | Query handler with eager-loaded contributions and budget names |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalById/SavingsGoalDetailDto.cs` | Application | Response DTO record (`Id`, `Name`, `TargetAmount`, `CurrentAmount`, `ProgressPercentage`, `RemainingAmount`, `TargetDate?`, `Description?`, `Status`, `List<ContributionDto>`, `CreatedAt`, `UpdatedAt`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalById/ContributionDto.cs` | Application | Nested DTO record (`Id`, `Amount`, `ContributionDate`, `Notes?`, `BudgetId?`, `BudgetName?`, `TransactionId?`, `CreatedAt`) |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint (named route `"GetSavingsGoalById"`) |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the query predicate level (`g.UserId == userId`), making a goal belonging to another user indistinguishable from a non-existent one — both produce `NotFoundException` (→ 404).

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Goal not found or belongs to another user | `NotFoundException` | 404 |

---

## Savings Goals — Get Savings Goal Progress

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Query
**HTTP Endpoint:** GET /api/v1/savings-goals/{id}/progress

### Description

Returns a rich analytics snapshot for a single savings goal. Beyond the basic progress fields, the response includes `DaysRemaining`, `IsOverdue`, `RequiredDailyAmount`, `AverageContributionAmount`, and `LastContributionDate`. All date-sensitive calculations are delegated to `IDateTimeProvider` to keep the handler fully unit-testable. This endpoint is intended to power dashboards and progress widgets.

### Workflow

1. Client sends `GET /api/v1/savings-goals/{id}/progress` with a GUID path parameter.
2. `SavingsGoalsController.GetProgress` receives `id` and dispatches `GetSavingsGoalProgressQuery(id)` via MediatR.
3. No validator is registered for `GetSavingsGoalProgressQuery`.
4. `GetSavingsGoalProgressQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the goal via `Include(g => g.Contributions).FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == userId, ct)`; throws `NotFoundException("SavingsGoal", id)` if null (→ 404).
   - Computes `ProgressPercentage` and `RemainingAmount` in memory.
   - Reads `today` from `_dateTimeProvider.UtcToday`.
   - Computes `DaysRemaining` (nullable `int`) as the integer day difference between `TargetDate` and `today`; null when `TargetDate` is absent.
   - Sets `IsOverdue = true` only when `TargetDate` is set, `Status == Active`, and `today > TargetDate`.
   - Computes `RequiredDailyAmount` as `RemainingAmount / DaysRemaining` when `DaysRemaining > 0`; null otherwise.
   - Derives `TotalContributions`, `AverageContributionAmount` (0 when empty), and `LastContributionDate` (max `ContributionDate`) from the loaded contributions collection.
   - Constructs and returns `SavingsGoalProgressDto`.
5. Returns `SavingsGoalProgressDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalProgress/GetSavingsGoalProgressQuery.cs` | Application | MediatR request record (`IRequest<SavingsGoalProgressDto>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalProgress/GetSavingsGoalProgressQueryHandler.cs` | Application | Analytics handler; uses `IDateTimeProvider` for all date math |
| `src/BudgetApp.Application/Features/SavingsGoals/Queries/GetSavingsGoalProgress/SavingsGoalProgressDto.cs` | Application | Response DTO record (`GoalId`, `Name`, `TargetAmount`, `CurrentAmount`, `ProgressPercentage`, `RemainingAmount`, `TargetDate?`, `DaysRemaining?`, `IsOverdue`, `RequiredDailyAmount?`, `Status`, `TotalContributions`, `AverageContributionAmount`, `LastContributionDate?`) |
| `src/BudgetApp.Application/Common/Interfaces/IDateTimeProvider.cs` | Application | Date/time abstraction (`UtcNow`, `UtcToday`) |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the query predicate level (`g.UserId == userId`). A goal belonging to another user surfaces as `NotFoundException` (→ 404).

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Goal not found or belongs to another user | `NotFoundException` | 404 |

### Notes

`DaysRemaining` can be negative when the target date has already passed and the goal is still active — in that case `IsOverdue` is `true` and `RequiredDailyAmount` is `null` (guarded by `DaysRemaining > 0`). `IsOverdue` is always `false` for Paused and Completed goals regardless of date, because only Active goals can be meaningfully overdue.

---

## Savings Goals — Create Savings Goal

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Command
**HTTP Endpoint:** POST /api/v1/savings-goals

### Description

Creates a new savings goal for the authenticated user. The goal is always initialised with `Status = Active` and `CurrentAmount = 0`. The target date is optional; when omitted the goal has no deadline. On success the endpoint returns the new goal's GUID and a `Location` header pointing to the Get By ID endpoint.

### Workflow

1. Client sends `POST /api/v1/savings-goals` with `{ name, targetAmount, targetDate?, description? }`.
2. `SavingsGoalsController.Create` receives `CreateSavingsGoalRequest` and dispatches `CreateSavingsGoalCommand(name, targetAmount, targetDate, description)` via MediatR.
3. `CreateSavingsGoalCommandValidator` validates the request — throws `ValidationException` on failure (→ 422):
   - `Name`: not empty, max 200 characters.
   - `TargetAmount`: greater than 0.
   - `TargetDate` (when provided): must be strictly after `IDateTimeProvider.UtcToday`.
   - `Description` (when provided): max 1000 characters.
4. `CreateSavingsGoalCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Constructs a `SavingsGoal` entity with `UserId`, `Name`, `TargetAmount`, `CurrentAmount = 0m`, `TargetDate`, `Description`, and `Status = SavingsGoalStatus.Active`.
   - Calls `_context.SavingsGoals.Add(goal)` and `_context.SaveChangesAsync(ct)`.
   - Returns `goal.Id`.
5. Returns `Guid` — HTTP `201 Created` with `Location: /api/v1/savings-goals/{id}`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/CreateSavingsGoal/CreateSavingsGoalCommand.cs` | Application | MediatR request record (`IRequest<Guid>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/CreateSavingsGoal/CreateSavingsGoalCommandHandler.cs` | Application | Business logic handler; sets initial `Status` and `CurrentAmount` |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/CreateSavingsGoal/CreateSavingsGoalCommandValidator.cs` | Application | FluentValidation rules; injects `IDateTimeProvider` for `TargetDate` future check |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint + `CreateSavingsGoalRequest` input record |

### Authorization

Requires a valid Bearer token. The `UserId` from `ICurrentUserService` is stamped onto the new entity at creation time; no additional ownership check is required.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty name, non-positive amount, past target date, description too long) | `ValidationException` | 422 |

### Notes

`CreateSavingsGoalCommandValidator` injects `IDateTimeProvider` (not `DateTime.UtcNow`) so the future-date check is mockable in unit tests. `TargetDate` validation uses `.When(x => x.TargetDate.HasValue)`, so an absent target date passes without error.

---

## Savings Goals — Update Savings Goal

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Command
**HTTP Endpoint:** PUT /api/v1/savings-goals/{id}

### Description

Updates the mutable metadata fields of an existing savings goal: `Name`, `TargetAmount`, `TargetDate`, and `Description`. The `Status` and `CurrentAmount` fields are not modifiable through this endpoint — use the dedicated Update Status endpoint for status transitions. A business rule prevents reducing `TargetAmount` below the amount already saved (`CurrentAmount`).

### Workflow

1. Client sends `PUT /api/v1/savings-goals/{id}` with `{ name, targetAmount, targetDate?, description? }`.
2. `SavingsGoalsController.Update` receives `id` and `UpdateSavingsGoalRequest`, then dispatches `UpdateSavingsGoalCommand(id, name, targetAmount, targetDate, description)` via MediatR.
3. `UpdateSavingsGoalCommandValidator` validates the request — throws `ValidationException` on failure (→ 422):
   - `Id`: not empty.
   - `Name`: not empty, max 200 characters.
   - `TargetAmount`: greater than 0.
   - `TargetDate` (when provided): must be strictly after `IDateTimeProvider.UtcToday`.
   - `Description` (when provided): max 1000 characters.
4. `UpdateSavingsGoalCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the goal via `FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == userId, ct)`; throws `NotFoundException("SavingsGoal", id)` if null (→ 404).
   - If `request.TargetAmount < goal.CurrentAmount`, throws `DomainException("TargetAmount cannot be less than the amount already saved.")` (→ 400).
   - Applies the four mutable fields (`Name`, `TargetAmount`, `TargetDate`, `Description`) and calls `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/UpdateSavingsGoal/UpdateSavingsGoalCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/UpdateSavingsGoal/UpdateSavingsGoalCommandHandler.cs` | Application | Business logic handler; enforces `TargetAmount` floor guard |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/UpdateSavingsGoal/UpdateSavingsGoalCommandValidator.cs` | Application | FluentValidation rules; injects `IDateTimeProvider` for `TargetDate` future check |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint + `UpdateSavingsGoalRequest` input record |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the query predicate level (`g.UserId == userId`). A goal belonging to another user surfaces as `NotFoundException` (→ 404).

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (empty name, non-positive amount, past target date) | `ValidationException` | 422 |
| Goal not found or belongs to another user | `NotFoundException` | 404 |
| `TargetAmount` lower than `CurrentAmount` | `DomainException` | 400 |

---

## Savings Goals — Delete Savings Goal

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Command
**HTTP Endpoint:** DELETE /api/v1/savings-goals/{id}

### Description

Permanently removes a savings goal from the system. This is a hard delete. Two guards prevent deletion: a goal that has any recorded contributions cannot be deleted (remove all contributions first), and a goal with `Status = Completed` cannot be deleted regardless of whether contributions exist.

### Workflow

1. Client sends `DELETE /api/v1/savings-goals/{id}`.
2. `SavingsGoalsController.Delete` receives `id` and dispatches `DeleteSavingsGoalCommand(id)` via MediatR.
3. No validator is registered for `DeleteSavingsGoalCommand`.
4. `DeleteSavingsGoalCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the goal via `Include(g => g.Contributions).FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == userId, ct)`; throws `NotFoundException("SavingsGoal", id)` if null (→ 404).
   - If `goal.Status == SavingsGoalStatus.Completed`, throws `DomainException("Cannot delete a completed savings goal.")` (→ 400).
   - If `goal.Contributions.Count > 0`, throws `DomainException("Cannot delete a savings goal that has existing contributions.")` (→ 400).
   - Calls `_context.SavingsGoals.Remove(goal)` and `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/DeleteSavingsGoal/DeleteSavingsGoalCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/DeleteSavingsGoal/DeleteSavingsGoalCommandHandler.cs` | Application | Hard-delete handler; evaluates Completed-status and contributions guards |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the query predicate level (`g.UserId == userId`). A goal belonging to another user surfaces as `NotFoundException` (→ 404).

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Goal not found or belongs to another user | `NotFoundException` | 404 |
| Goal has `Status = Completed` | `DomainException` | 400 |
| Goal has one or more contributions | `DomainException` | 400 |

### Notes

The Completed-status guard is evaluated before the contributions guard, so a completed goal with contributions fails at the status check first. There is no validator for `DeleteSavingsGoalCommand` — the single GUID parameter is validated by the `{id:guid}` ASP.NET Core route constraint, consistent with the delete-command pattern elsewhere in this codebase.

---

## Savings Goals — Update Savings Goal Status

**Date Added:** 2026-03-22
**Entity:** SavingsGoal
**Type:** Command
**HTTP Endpoint:** PATCH /api/v1/savings-goals/{id}/status

### Description

Transitions a savings goal to a new status according to a strict state machine. `Completed` and `Cancelled` are terminal states from which no further transitions are permitted. A Paused goal cannot be marked `Completed` directly — it must first be resumed to `Active`. Manually marking a goal `Completed` requires that `CurrentAmount >= TargetAmount`.

### Workflow

1. Client sends `PATCH /api/v1/savings-goals/{id}/status` with `{ status }`.
2. `SavingsGoalsController.UpdateStatus` receives `id` and `UpdateSavingsGoalStatusRequest`, then dispatches `UpdateSavingsGoalStatusCommand(id, status)` via MediatR.
3. `UpdateSavingsGoalStatusCommandValidator` validates the request — throws `ValidationException` on failure (→ 422):
   - `Id`: not empty.
   - `Status`: must be a valid `SavingsGoalStatus` enum value.
4. `UpdateSavingsGoalStatusCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the goal via `FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == userId, ct)`; throws `NotFoundException("SavingsGoal", id)` if null (→ 404).
   - If `goal.Status == Completed`, throws `DomainException("A completed savings goal cannot change status.")` (→ 400).
   - If `goal.Status == Cancelled`, throws `DomainException("A cancelled savings goal cannot change status.")` (→ 400).
   - If `goal.Status == request.Status`, throws `DomainException("Goal is already {status}.")` (→ 400).
   - If `goal.Status == Paused && request.Status == Completed`, throws `DomainException("Cannot mark a paused goal as completed directly. Resume it first.")` (→ 400).
   - If `request.Status == Completed && goal.CurrentAmount < goal.TargetAmount`, throws `DomainException("Cannot mark as completed — target amount has not been reached.")` (→ 400).
   - Sets `goal.Status = request.Status` and calls `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/UpdateSavingsGoalStatus/UpdateSavingsGoalStatusCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/UpdateSavingsGoalStatus/UpdateSavingsGoalStatusCommandHandler.cs` | Application | State-machine handler; enforces all transition rules and target-amount guard |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/UpdateSavingsGoalStatus/UpdateSavingsGoalStatusCommandValidator.cs` | Application | FluentValidation rules (`Id` not empty, `Status` is valid enum value) |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint + `UpdateSavingsGoalStatusRequest` input record |

### Authorization

Requires a valid Bearer token. Ownership is enforced at the query predicate level (`g.UserId == userId`). A goal belonging to another user surfaces as `NotFoundException` (→ 404).

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Invalid `Status` enum value | `ValidationException` | 422 |
| Goal not found or belongs to another user | `NotFoundException` | 404 |
| Goal is already `Completed` (terminal state) | `DomainException` | 400 |
| Goal is already `Cancelled` (terminal state) | `DomainException` | 400 |
| Goal status already equals the requested status | `DomainException` | 400 |
| `Paused → Completed` transition attempted | `DomainException` | 400 |
| `Completed` requested but `CurrentAmount < TargetAmount` | `DomainException` | 400 |

### Notes

The handler evaluates the `Paused → Completed` guard before the target-amount guard. This means a paused goal that has not reached its target fails with the "resume first" message. Auto-completion triggered by `AddContribution` (when `CurrentAmount >= TargetAmount`) bypasses this handler entirely — it is a direct field assignment within `AddContributionCommandHandler`, not a transition through this endpoint.

---

## Savings Goals — Add Contribution

**Date Added:** 2026-03-22
**Entity:** SavingsContribution
**Type:** Command
**HTTP Endpoint:** POST /api/v1/savings-goals/{id}/contributions

### Description

Records a monetary contribution to an active savings goal and atomically updates the goal's denormalized `CurrentAmount`. If the updated `CurrentAmount` meets or exceeds `TargetAmount`, the goal's status is automatically set to `Completed` within the same database transaction. The contribution may optionally be linked to an existing budget and/or transaction record belonging to the same user. Returns the new contribution's GUID.

### Workflow

1. Client sends `POST /api/v1/savings-goals/{id}/contributions` with `{ amount, contributionDate, notes?, budgetId?, transactionId? }`.
2. `SavingsGoalsController.AddContribution` receives `id` and `AddContributionRequest`, then dispatches `AddContributionCommand(savingsGoalId, amount, contributionDate, notes, budgetId, transactionId)` via MediatR.
3. `AddContributionCommandValidator` validates the request — throws `ValidationException` on failure (→ 422):
   - `SavingsGoalId`: not empty.
   - `Amount`: greater than 0.
   - `ContributionDate`: must not be the default `DateOnly` value.
   - `Notes` (when provided): max 2000 characters.
4. `AddContributionCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the goal via `FirstOrDefaultAsync(g => g.Id == request.SavingsGoalId && g.UserId == userId, ct)`; throws `NotFoundException("SavingsGoal", savingsGoalId)` if null (→ 404).
   - If `goal.Status != Active`, throws `DomainException("Contributions can only be added to active savings goals.")` (→ 400).
   - If `BudgetId` is provided, verifies ownership via `_context.Budgets.AnyAsync(b => b.Id == budgetId && b.UserId == userId, ct)`; throws `NotFoundException("Budget", budgetId)` if not found (→ 404).
   - If `TransactionId` is provided, verifies ownership via `_context.Transactions.AnyAsync(t => t.Id == transactionId && t.UserId == userId, ct)`; throws `NotFoundException("Transaction", transactionId)` if not found (→ 404).
   - Constructs a `SavingsContribution` entity and calls `_context.SavingsContributions.Add(contribution)`.
   - Sets `goal.CurrentAmount += request.Amount`.
   - If `goal.CurrentAmount >= goal.TargetAmount`, sets `goal.Status = SavingsGoalStatus.Completed`.
   - Calls `_context.SaveChangesAsync(ct)` — the new contribution row and the updated goal row persist atomically.
   - Returns `contribution.Id`.
5. Returns `Guid` — HTTP `201 Created` with `Location: /api/v1/savings-goals/{id}`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/AddContribution/AddContributionCommand.cs` | Application | MediatR request record (`IRequest<Guid>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/AddContribution/AddContributionCommandHandler.cs` | Application | Business logic handler; manages `CurrentAmount` increment and auto-completion |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/AddContribution/AddContributionCommandValidator.cs` | Application | FluentValidation rules |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint + `AddContributionRequest` input record |

### Authorization

Requires a valid Bearer token. Goal ownership is enforced at the query predicate level. Optional `BudgetId` and `TransactionId` links are verified against `b.UserId == userId` and `t.UserId == userId` respectively — a non-owned or non-existent linked record surfaces as `NotFoundException` (→ 404), preventing cross-user data linking.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Validation failure (zero/negative amount, missing date, notes too long) | `ValidationException` | 422 |
| Goal not found or belongs to another user | `NotFoundException` | 404 |
| Goal is not in `Active` status | `DomainException` | 400 |
| `BudgetId` not found or belongs to another user | `NotFoundException` | 404 |
| `TransactionId` not found or belongs to another user | `NotFoundException` | 404 |

### Notes

`CurrentAmount` is a denormalized field maintained in-process. The increment and optional auto-completion are applied to the tracked EF entity before `SaveChangesAsync`, so both the new `SavingsContributions` row and the updated `SavingsGoals` row are written in a single database transaction. The `Location` header in the 201 response points to the goal detail endpoint (`GetSavingsGoalById`) rather than a dedicated contribution endpoint — contributions are accessed through their parent goal.

---

## Savings Goals — Remove Contribution

**Date Added:** 2026-03-22
**Entity:** SavingsContribution
**Type:** Command
**HTTP Endpoint:** DELETE /api/v1/savings-goals/{id}/contributions/{contributionId}

### Description

Removes a single contribution from a savings goal and atomically decrements the goal's denormalized `CurrentAmount`. The decrement is clamped to a minimum of 0 to guard against data inconsistency. Removal is blocked when the goal has `Status = Completed` — the caller must first transition the goal to a non-terminal status via the Update Status endpoint. Ownership of the contribution is derived from the parent goal's `UserId`, not stored redundantly on the contribution itself.

### Workflow

1. Client sends `DELETE /api/v1/savings-goals/{id}/contributions/{contributionId}`.
2. `SavingsGoalsController.RemoveContribution` receives `id` and `contributionId`, then dispatches `RemoveContributionCommand(id, contributionId)` via MediatR.
3. No validator is registered for `RemoveContributionCommand`.
4. `RemoveContributionCommandHandler` handles the command:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Fetches the contribution via `Include(c => c.SavingsGoal).FirstOrDefaultAsync(c => c.Id == request.ContributionId && c.SavingsGoal.UserId == userId, ct)`; throws `NotFoundException("SavingsContribution", contributionId)` if null (→ 404).
   - If `contribution.SavingsGoalId != request.SavingsGoalId`, throws `NotFoundException("SavingsContribution", contributionId)` (→ 404) — the contribution exists but belongs to a different goal.
   - If `goal.Status == SavingsGoalStatus.Completed`, throws `DomainException("Cannot remove a contribution from a completed savings goal. Update the status first.")` (→ 400).
   - Sets `goal.CurrentAmount = Math.Max(0m, goal.CurrentAmount - contribution.Amount)`.
   - Calls `_context.SavingsContributions.Remove(contribution)` and `_context.SaveChangesAsync(ct)`.
5. Returns `Unit.Value` — HTTP `204 No Content`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/RemoveContribution/RemoveContributionCommand.cs` | Application | MediatR request record (`IRequest<Unit>`) |
| `src/BudgetApp.Application/Features/SavingsGoals/Commands/RemoveContribution/RemoveContributionCommandHandler.cs` | Application | Hard-delete handler; decrements `CurrentAmount` and enforces Completed-status guard |
| `src/BudgetApp.API/Controllers/SavingsGoalsController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Ownership is established through the parent goal: the query joins through `c.SavingsGoal.UserId == userId`, so a contribution whose parent goal belongs to another user surfaces as `NotFoundException` (→ 404). The `SavingsGoalId` path-mismatch check also surfaces as `NotFoundException` to avoid leaking whether the contribution ID exists under a different goal.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| Contribution not found or parent goal belongs to another user | `NotFoundException` | 404 |
| Contribution belongs to a different savings goal than the path `{id}` | `NotFoundException` | 404 |
| Parent goal has `Status = Completed` | `DomainException` | 400 |

### Notes

There is no validator for `RemoveContributionCommand` — both parameters are GUIDs validated by the `{id:guid}` and `{contributionId:guid}` route constraints, consistent with the delete-command pattern elsewhere in this codebase. The `CurrentAmount` floor clamp (`Math.Max(0m, ...)`) prevents a negative balance in the event of data inconsistency, but under normal operation the subtraction will never produce a value below 0.

---

## Dashboard — Get Dashboard Summary

**Date Added:** 2026-03-22
**Entity:** Transaction, Budget, SavingsGoal
**Type:** Query
**HTTP Endpoint:** GET /api/v1/dashboard/summary

### Description

Returns a high-level financial snapshot for the authenticated user covering a configurable date window that defaults to the current calendar month. The response combines transaction aggregates (income, expenses, savings deposits/withdrawals, derived metrics), counts of active budgets and savings goals, and — when at least one active budget exists — a `BudgetHealthDto` comparing planned versus actual figures for the most-recently started active budget. This endpoint is intended as the landing-screen query for the dashboard view.

### Workflow

1. Client sends `GET /api/v1/dashboard/summary` with optional query parameters: `from` and `to` (both `DateOnly`).
2. `DashboardController.GetSummary` receives the parameters and dispatches `GetDashboardSummaryQuery(from, to)` via MediatR.
3. No validator is registered — parameters are optional and defaults are applied in the handler.
4. `GetDashboardSummaryQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Defaults `from` to the first day of the current calendar month and `to` to the last day, using `_dateTimeProvider.UtcToday`.
   - Guards: if `from > to`, throws `DomainException("The 'from' date must not be later than the 'to' date.")` (→ 400).
   - Issues a single grouped `SELECT` on `Transactions` filtered by `UserId` and the date range, aggregating `TotalIncome`, `TotalExpenses`, `TotalSavingsDeposits`, `TotalSavingsWithdrawals`, and `Count` server-side.
   - Queries active budgets (those where `StartDate <= today && EndDate >= today`) ordered by `StartDate` descending; takes the first as the `currentBudget`.
   - Issues `CountAsync` on `SavingsGoals` for active status.
   - If `currentBudget` is not null, issues a second transaction query grouped by `TransactionType` for that budget (also filtered by `UserId`) to compute `incomeActual`, `expensesActual`, and `savingsActual`, then calculates `OverallBudgetVariance` as `(IncomePlanned - incomeActual) - (expensesActual - ExpensesPlanned) - (savingsActual - SavingsPlanned)` (positive = ahead of plan).
   - Derives `NetCashFlow = TotalIncome - TotalExpenses`, `NetSavings = TotalSavingsDeposits - TotalSavingsWithdrawals`, and `SavingsRate = NetSavings / TotalIncome * 100` (0 when income is 0).
5. Returns `DashboardSummaryDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSummary/GetDashboardSummaryQuery.cs` | Application | MediatR request record (`IRequest<DashboardSummaryDto>`) |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSummary/GetDashboardSummaryQueryHandler.cs` | Application | Aggregation handler; two DB round-trips when an active budget exists, one otherwise |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSummary/DashboardSummaryDto.cs` | Application | Response DTO (`DashboardSummaryDto` record) and nested `BudgetHealthDto` record |
| `src/BudgetApp.API/Controllers/DashboardController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. All database queries are predicated on `UserId == _currentUser.UserId`, including the secondary transaction query for budget actuals. There is no separate entity-ownership lookup — isolation is enforced exclusively through the `UserId` column filter on every query.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| `from` is later than `to` | `DomainException` | 400 |

### Notes

The date-window default is the current calendar month (first-to-last day), not a rolling 30-day window. This aligns with how budgets and categories are typically analyzed. When no active budget exists today, `CurrentBudget` in the response is `null` — the caller must check for this. The budget health variance formula is designed so that a positive value always means the user is ahead of their plan (more income than planned, less expenses than planned, more savings than planned).

---

## Dashboard — Get Dashboard Spending

**Date Added:** 2026-03-22
**Entity:** Transaction, Category
**Type:** Query
**HTTP Endpoint:** GET /api/v1/dashboard/spending

### Description

Returns a spending and income breakdown by category for a configurable date window, defaulting to the current calendar month. The response includes ranked lists of the top expense and top income categories (capped by the configurable `TopN` parameter), and an optional `SpendingComparisonDto` comparing totals to the immediately preceding period of equal length. This endpoint supports the spending-analysis section of the dashboard.

### Workflow

1. Client sends `GET /api/v1/dashboard/spending` with optional query parameters: `from`, `to` (both `DateOnly`), and `topN` (integer).
2. `DashboardController.GetSpending` dispatches `GetDashboardSpendingQuery(from, to, topN)` via MediatR.
3. No validator is registered — all parameters are optional with in-handler defaults.
4. `GetDashboardSpendingQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Defaults `from`/`to` to the current calendar month; clamps `topN` to `[1, 20]` (default 5).
   - Guards: if `from > to`, throws `DomainException("The 'from' date must not be later than the 'to' date.")` (→ 400).
   - Issues one `GroupBy(CategoryId, Name, Icon, Color, CategoryType, TransactionType)` query on `Transactions`, filtered to `Expense` and `Income` types only in the current period — one DB round-trip.
   - Computes `totalExpenses` and `totalIncome` from the in-memory result set, then builds `topExpenseCategories` and `topIncomeCategories` lists (each sorted by `Total` descending, limited to `topN`, with `PercentageOfTotal` calculated client-side).
   - Computes the previous period window: `windowDays = to - from + 1`; `previousFrom = from - windowDays`; `previousTo = from - 1`.
   - Issues a second aggregation query for the previous period (same `UserId` filter, `Expense`/`Income` only) — one additional DB round-trip.
   - Sets `PreviousPeriodComparison` to `null` if both `prevExpenses == 0` and `prevIncome == 0`; otherwise constructs `SpendingComparisonDto` with absolute and percentage change figures.
5. Returns `DashboardSpendingDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSpending/GetDashboardSpendingQuery.cs` | Application | MediatR request record (`IRequest<DashboardSpendingDto>`) |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSpending/GetDashboardSpendingQueryHandler.cs` | Application | Two-query handler; current-period groupBy + previous-period aggregation |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSpending/DashboardSpendingDto.cs` | Application | Response DTO (`DashboardSpendingDto`), `SpendingByCategoryDto`, and `SpendingComparisonDto` records |
| `src/BudgetApp.API/Controllers/DashboardController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. Both database queries filter by `UserId == _currentUser.UserId`. Category metadata (name, icon, color) is read via navigation join — no separate authorization check on category ownership is needed because only the current user's transactions are fetched.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |
| `from` is later than `to` | `DomainException` | 400 |

### Notes

`PreviousPeriodComparison` is `null` — not zeroed — when the previous period has no data. This is intentional: returning a comparison object with all-zero values would be misleading to a client rendering percentage-change indicators. `PercentageOfTotal` for income categories is calculated against `totalIncome`, not `totalExpenses`, ensuring each list's percentages sum to 100. The `topN` clamp of `[1, 20]` is applied silently in the handler rather than through a validator, matching the no-validation design decision for this feature.

---

## Dashboard — Get Dashboard Trends

**Date Added:** 2026-03-22
**Entity:** Transaction
**Type:** Query
**HTTP Endpoint:** GET /api/v1/dashboard/trends

### Description

Returns month-over-month financial trend data for the past N calendar months (default 6, maximum 12) for the authenticated user. Each month in the window is represented by a `MonthlyTrendDto` with income, expense, savings, net cash flow, net savings, and transaction count — zero-filled for months with no activity. The response also includes per-series averages and a `TrendDirection` (Up/Down/Flat) for income, expenses, and net savings computed by comparing the average of the first half of the window to the average of the second half with a 1% threshold. This endpoint supports a time-series chart on the dashboard.

### Workflow

1. Client sends `GET /api/v1/dashboard/trends` with optional query parameter `months` (integer).
2. `DashboardController.GetTrends` dispatches `GetDashboardTrendsQuery(months)` via MediatR.
3. No validator is registered — `months` is optional with an in-handler default.
4. `GetDashboardTrendsQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Clamps `months` to `[1, 12]` (default 6).
   - Computes `startOfWindow` as the first day of `today - (months - 1) months` and `endOfWindow` as the last day of the current month, using `_dateTimeProvider.UtcToday`.
   - Issues a single `GroupBy(Year, Month, TransactionType)` query on `Transactions` filtered by `UserId` and the window — one DB round-trip.
   - Iterates the `months`-length sequence from oldest to newest; for each month retrieves pre-grouped rows from an in-memory dictionary, summing by `TransactionType`; zero-fills months absent from the result set.
   - Formats `MonthLabel` using `DateOnly.ToString("MMM yyyy", CultureInfo.InvariantCulture)` (e.g., `"Mar 2026"`).
   - Calculates averages across all months for income, expenses, net cash flow, and net savings.
   - Computes `TrendDirection` for income, expenses, and net savings via the private `ComputeDirection` method: splits the values list at the midpoint, computes averages of each half, and classifies as `Up` / `Down` / `Flat` using a 1% relative threshold; returns `Flat` when the list has fewer than 2 elements or the first-half average is 0.
5. Returns `DashboardTrendsDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardTrends/GetDashboardTrendsQuery.cs` | Application | MediatR request record (`IRequest<DashboardTrendsDto>`) |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardTrends/GetDashboardTrendsQueryHandler.cs` | Application | Single-query handler; zero-fills missing months in memory, computes trend direction |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardTrends/DashboardTrendsDto.cs` | Application | Response DTO (`DashboardTrendsDto`) and `MonthlyTrendDto` records |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardTrends/TrendDirection.cs` | Application | `TrendDirection` enum (Up, Down, Flat) |
| `src/BudgetApp.API/Controllers/DashboardController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. The single database query filters exclusively by `UserId == _currentUser.UserId`. No per-entity ownership check is needed — the query is a pure aggregation over the user's own transactions.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |

### Notes

`TrendDirection` is defined in the Application layer (not Domain) because it is a presentation-layer concept with no business-rule significance. The upper bound of the window is always the last day of the current calendar month, which means future-dated transactions within the current month are included but transactions beyond the current month are excluded. `MonthLabel` uses `CultureInfo.InvariantCulture` to ensure locale-independent formatting (`"Mar 2026"`, not locale-specific month names).

---

## Dashboard — Get Dashboard Savings

**Date Added:** 2026-03-22
**Entity:** SavingsGoal, SavingsContribution
**Type:** Query
**HTTP Endpoint:** GET /api/v1/dashboard/savings

### Description

Returns a complete savings overview for the authenticated user with no date-range parameters. The response contains overall portfolio-level metrics (total target, total current, overall progress percentage), goal status counts (active, completed, overdue), the total amount saved in the current calendar month across all goals, and a ranked list of per-goal snapshots for all active goals. This endpoint supports the savings-tracking section of the dashboard.

### Workflow

1. Client sends `GET /api/v1/dashboard/savings` (no parameters).
2. `DashboardController.GetSavings` dispatches `GetDashboardSavingsQuery()` via MediatR.
3. No validator is registered — the query takes no parameters.
4. `GetDashboardSavingsQueryHandler` handles the query:
   - Reads `_currentUser.UserId`; throws `ForbiddenException("User is not authenticated.")` if null (→ 403).
   - Issues a projection-only query (`Select(g => new { g.Status, g.TargetDate })`) on all of the user's `SavingsGoals` to compute `activeGoalCount`, `completedGoalCount`, and `overdueGoalCount` (active goals where `TargetDate` is in the past per `_dateTimeProvider.UtcToday`) — first DB round-trip.
   - Issues a second query with `Include(g => g.Contributions)` filtered to active goals only — second DB round-trip.
   - Issues a `SumAsync` on `SavingsContributions` joined via `c.SavingsGoal.UserId == userId` filtered to the current calendar month (`ContributionDate.Year == today.Year && ContributionDate.Month == today.Month`) — third DB round-trip.
   - Computes portfolio-level `TotalTargetAmount`, `TotalCurrentAmount`, and `OverallProgressPercentage` (capped at 100) from the active goals list in memory.
   - For each active goal builds a `SavingsGoalSnapshotDto` in memory: `ProgressPercentage` (capped at 100), `RemainingAmount` (floored at 0), `DaysRemaining` (null when no `TargetDate`), `IsOverdue`, `RequiredMonthlyAmount` (remaining divided by daysRemaining/30.44, null when overdue or no target date), `LastContributionDate` (max contribution date, null if no contributions).
   - Sorts snapshots by `ProgressPercentage` descending.
5. Returns `DashboardSavingsDto` — HTTP `200 OK`.

### Components

| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSavings/GetDashboardSavingsQuery.cs` | Application | MediatR request record (`IRequest<DashboardSavingsDto>`) |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSavings/GetDashboardSavingsQueryHandler.cs` | Application | Three-query handler; projection for counts, Include for snapshots, SumAsync for monthly total |
| `src/BudgetApp.Application/Features/Dashboard/Queries/GetDashboardSavings/DashboardSavingsDto.cs` | Application | Response DTO (`DashboardSavingsDto`) and `SavingsGoalSnapshotDto` records |
| `src/BudgetApp.API/Controllers/DashboardController.cs` | API | HTTP endpoint |

### Authorization

Requires a valid Bearer token. All three database queries filter by `UserId == _currentUser.UserId` (or via `c.SavingsGoal.UserId == userId` for the contributions aggregate). No separate ownership check is performed because the `UserId` predicate itself is the authorization boundary.

### Error Responses

| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| No or invalid Bearer token | 401 (JWT middleware, before handler) | 401 |
| `UserId` claim absent despite valid token | `ForbiddenException` | 403 |

### Notes

The handler uses three separate DB round-trips by design: the first uses a lightweight projection (no `Include`) to compute status counts without loading contribution data; the second loads only active goals with contributions for snapshot computation; the third is a server-side `SumAsync` to avoid pulling all contributions into memory for the monthly total. `OverdueGoalCount` is derived from the status-projection query (overdue = active + TargetDate in the past) and may differ from `ActiveGoalCount` — a goal can be both active and overdue simultaneously. `RequiredMonthlyAmount` uses 30.44 days/month as the average month length to avoid introducing a dependency on exact calendar calculations.

---

## Budget — IsRecurring Field

**Date Added:** 2026-03-29
**Entity:** Budget
**Type:** Command + Query (cross-cutting field change)
**HTTP Endpoint:** Propagated through `POST /api/v1/budgets`, `PUT /api/v1/budgets/{id}`, `GET /api/v1/budgets`, `GET /api/v1/budgets/{id}`

### Description
Adds a boolean `IsRecurring` property to the `Budget` entity, indicating whether a budget is intended to repeat on a regular cadence. The field defaults to `false` in the database (via EF migration) so all existing budgets remain non-recurring without data migration. It is exposed in both the list (`BudgetSummaryDto`) and detail (`BudgetDetailDto`) response shapes, and is accepted as an input on both create and update operations. This field is the prerequisite gate for the `RollForwardBudget` command — only budgets with `IsRecurring == true` may be rolled forward to the next period.

### Workflow

**Create path:**
1. Client sends `POST /api/v1/budgets` with a request body that includes `"isRecurring": true|false`
2. `BudgetsController.Create` maps the field from `CreateBudgetRequest` into `CreateBudgetCommand`
3. `CreateBudgetCommandValidator` validates the command (existing date/amount rules — no specific rule on `IsRecurring`)
4. `CreateBudgetCommandHandler` sets `budget.IsRecurring = request.IsRecurring` before `_context.SaveChangesAsync(ct)`
5. Returns the new budget `Guid` — HTTP 201 Created

**Update path:**
1. Client sends `PUT /api/v1/budgets/{id}` with a request body that includes `"isRecurring": true|false`
2. `BudgetsController.Update` maps the field from `UpdateBudgetRequest` into `UpdateBudgetCommand`
3. `UpdateBudgetCommandValidator` validates the command
4. `UpdateBudgetCommandHandler` sets `budget.IsRecurring = request.IsRecurring` then calls `_context.SaveChangesAsync(ct)`
5. Returns HTTP 204 No Content

**Read path:**
- `GetBudgetsQueryHandler` projects `IsRecurring` into `BudgetSummaryDto` — returned in `GET /api/v1/budgets`
- `GetBudgetByIdQueryHandler` projects `IsRecurring` into `BudgetDetailDto` — returned in `GET /api/v1/budgets/{id}`

### Components
| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Domain/Entities/Budget.cs` | Domain | Adds `bool IsRecurring` property to the `Budget` entity |
| `src/BudgetApp.Infrastructure/Persistence/Migrations/20260330012816_AddBudgetIsRecurring.cs` | Infrastructure | EF migration — adds `IsRecurring boolean NOT NULL DEFAULT false` column to `Budgets` table |
| `src/BudgetApp.Application/Features/Budgets/Commands/CreateBudget/CreateBudgetCommand.cs` | Application | Adds `bool IsRecurring` parameter to the command record |
| `src/BudgetApp.Application/Features/Budgets/Commands/CreateBudget/CreateBudgetCommandHandler.cs` | Application | Sets `budget.IsRecurring = request.IsRecurring` during budget creation |
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudget/UpdateBudgetCommand.cs` | Application | Adds `bool IsRecurring` parameter to the command record |
| `src/BudgetApp.Application/Features/Budgets/Commands/UpdateBudget/UpdateBudgetCommandHandler.cs` | Application | Sets `budget.IsRecurring = request.IsRecurring` during budget update |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgets/BudgetSummaryDto.cs` | Application | Exposes `bool IsRecurring` in the list-view response shape |
| `src/BudgetApp.Application/Features/Budgets/Queries/GetBudgetById/BudgetDetailDto.cs` | Application | Exposes `bool IsRecurring` in the detail-view response shape |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | `CreateBudgetRequest` and `UpdateBudgetRequest` both include `bool IsRecurring`; controller maps the field into respective commands |

### Authorization
No dedicated authorization logic specific to this field. Ownership enforcement follows the existing Budget pattern: `CreateBudgetCommandHandler` and `UpdateBudgetCommandHandler` each resolve `_currentUser.UserId` and throw `ForbiddenException` if unauthenticated. `UpdateBudgetCommandHandler` additionally filters the DB query by `UserId` before applying any field mutation.

### Error Responses
| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| Unauthenticated user on create or update | `ForbiddenException` | 403 |
| Budget not found on update | `NotFoundException` | 404 |
| Validation failure on create or update | `ValidationException` | 422 |

### Notes
The column is added with `DEFAULT false`, meaning all budgets that existed before the migration have `IsRecurring = false` automatically and require no back-fill. The field carries no validation rule of its own — it is a plain boolean with no constraints beyond the EF column definition. Its primary purpose is to act as an eligibility gate for the `RollForwardBudget` command documented below.

---

## Budget — Roll Forward

**Date Added:** 2026-03-29
**Entity:** Budget
**Type:** Command
**HTTP Endpoint:** `POST /api/v1/budgets/{id}/roll-forward`

### Description
Creates the next period's budget by cloning an existing recurring budget one full period into the future. The source budget is never modified; a new `Budget` row is inserted with dates advanced according to the budget's `BudgetType`, with all `BudgetCategories` (including planned amounts and notes) copied over. Transactions are not carried across — they belong to their original period. This feature supports the periodic budget workflow where users want to start the next month, week, or quarter with the same structure as the previous one without manual re-entry.

### Workflow
1. Client sends `POST /api/v1/budgets/{id}/roll-forward` (no request body; `id` is the source budget's `Guid`)
2. `BudgetsController.RollForward` dispatches `RollForwardBudgetCommand(id)` via MediatR
3. No validator is registered for this command — the single `Guid` input is sufficient; route constraint `{id:guid}` handles malformed identifiers
4. `RollForwardBudgetCommandHandler` handles the request:
   - Resolves `userId` from `_currentUser.UserId` — throws `ForbiddenException("User is not authenticated.")` if null
   - Loads the source budget with `.Include(b => b.BudgetCategories)` filtered by `Id == request.BudgetId && UserId == userId` — throws `NotFoundException(nameof(Budget), request.BudgetId)` if not found or not owned
   - Guards `source.IsRecurring == false` — throws `DomainException("Only recurring budgets can be rolled forward.")`
   - Calls `AdvancePeriod(source)` to compute `(newStart, newEnd)` based on `BudgetType`:
     - `Monthly` — StartDate +1 month, EndDate +1 month
     - `Weekly` — +7 days each
     - `Biweekly` — +14 days each
     - `Quarterly` — +3 months each
     - `Annual` — +1 year each
     - `Custom` — span in days preserved exactly (`spanDays = EndDate.DayNumber - StartDate.DayNumber + 1`); both dates shifted by `spanDays`
   - Runs an overlap check via `AnyAsync` where `UserId == userId && Id != sourceId && StartDate <= newEnd && EndDate >= newStart` — throws `DomainException` with the conflicting date range message if any existing budget overlaps
   - Constructs a new `Budget` cloning: `Name`, `BudgetType`, `IsRecurring`, `TotalIncomePlanned`, `TotalExpensesPlanned`, `TotalSavingsPlanned`, and each `BudgetCategory` (`CategoryId`, `PlannedAmount`, `Notes`)
   - Adds the new budget via `_context.Budgets.Add(next)` and persists with `_context.SaveChangesAsync(ct)`
5. Returns the new budget's `Guid` — HTTP 201 Created with `Location` header pointing to `GET /api/v1/budgets/{newId}`

### Components
| File | Layer | Role |
|------|-------|------|
| `src/BudgetApp.Application/Features/Budgets/Commands/RollForwardBudget/RollForwardBudgetCommand.cs` | Application | MediatR request record — `record RollForwardBudgetCommand(Guid BudgetId) : IRequest<Guid>` |
| `src/BudgetApp.Application/Features/Budgets/Commands/RollForwardBudget/RollForwardBudgetCommandHandler.cs` | Application | Business logic — period advancement, overlap guard, budget cloning, persistence |
| `src/BudgetApp.API/Controllers/BudgetsController.cs` | API | `POST {id:guid}/roll-forward` action — dispatches command and returns 201 with Location header |
| `src/BudgetApp.Domain/Entities/Budget.cs` | Domain | Source and target entity; `IsRecurring` and `BudgetCategories` navigation property are consumed by the handler |

### Authorization
The handler immediately resolves `_currentUser.UserId` and throws `ForbiddenException` if the claim is absent (unauthenticated request that bypassed the `[Authorize]` attribute). Ownership of the source budget is enforced inside the EF query predicate (`b.UserId == userId`), so a request targeting another user's budget surfaces as `NotFoundException` rather than `ForbiddenException` — consistent with the "don't confirm existence of other users' resources" pattern used across all Budget handlers. The overlap check also filters by `UserId`, ensuring only the current user's budgets are considered in the conflict detection.

### Error Responses
| Scenario | Exception Thrown | HTTP Status |
|----------|-----------------|-------------|
| Unauthenticated (no valid JWT) | `ForbiddenException` | 403 |
| Source budget not found or belongs to another user | `NotFoundException` | 404 |
| Source budget has `IsRecurring == false` | `DomainException` | 400 |
| New period overlaps an existing budget for this user | `DomainException` | 400 |
| Unsupported `BudgetType` value in `AdvancePeriod` | `DomainException` | 400 |

### Notes
No validator class exists for this command by design — with a single `Guid` route parameter, FluentValidation would add no meaningful safety beyond the route constraint already enforced by ASP.NET Core (`{id:guid}`). The overlap check uses the standard date-intersection predicate (`StartDate <= newEnd && EndDate >= newStart`), which correctly identifies all overlap cases including partial overlaps, containment, and exact boundary matches. `BudgetCategories` are cloned as new entity instances with no `Id` set so EF generates fresh keys; the source `BudgetCategory.Id` values are intentionally not copied, preventing EF identity conflicts. Transactions are not cloned because they represent actuals for the source period and would corrupt the new period's reporting from day one.

