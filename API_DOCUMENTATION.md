# Grid Map API Documentation

This document provides detailed information about all available API endpoints, request parameters, and response formats for the Grid Map application.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Authentication is handled by Firebase on the frontend. For protected routes, include the Firebase UID in the request headers:

```
Firebase-UID: YOUR_FIREBASE_UID
```

---

## User Endpoints

### Create User (After Firebase Authentication)

Saves a user to the database after successful Firebase authentication.

- **URL**: `/users/create`
- **Method**: `POST`
- **Auth Required**: No
- **Content-Type**: `application/json`

**Request Body:**

```json
{
  "id": "a258",
  "uid": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Success Response:**

- **Code**: 201 Created
- **Content**: 
```json
{
  "message": "User created successfully",
  "user": {
    "id": "a258",
    "uid": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "email": "user@example.com",
    "name": "John Doe",
    "tokens": 480
  }
}
```

**User Already Exists Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "message": "User already exists",
  "user": {
    "id": "a258",
    "uid": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "email": "user@example.com",
    "name": "John Doe",
    "tokens": 480,
    "properties": []
  }
}
```

**Error Response:**

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Get User Profile

Retrieve the user's profile information including their properties.

- **URL**: `/users/profile`
- **Method**: `GET`
- **Auth Required**: Yes (Firebase-UID header)

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "id": "a258",
  "uid": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
  "email": "user@example.com",
  "name": "John Doe",
  "tokens": 480,
  "properties": [
    {
      "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
      "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
      "cells": ["cell1", "cell2", "..."],
      "price": 30,
      "name": "my place",
      "description": "A nice property",
      "address": "123 Main St",
      "forSale": false,
      "salePrice": 4
    }
  ]
}
```

**Error Responses:**

- **Code**: 401 Unauthorized
- **Content**: 
```json
{
  "message": "Firebase UID is required"
}
```

OR

- **Code**: 401 Unauthorized
- **Content**: 
```json
{
  "message": "User not found in database"
}
```

OR

- **Code**: 404 Not Found
- **Content**: 
```json
{
  "message": "User not found"
}
```

OR

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Update User

Update user profile information (name or tokens).

- **URL**: `/users/update`
- **Method**: `PUT`
- **Auth Required**: Yes (Firebase-UID header)
- **Content-Type**: `application/json`

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "tokens": 500
}
```

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "a258",
    "uid": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "email": "user@example.com",
    "name": "Updated Name",
    "tokens": 500
  }
}
```

**Error Responses:**

- **Code**: 401 Unauthorized
- **Content**: Same as Get User Profile endpoint

- **Code**: 404 Not Found
- **Content**: 
```json
{
  "message": "User not found"
}
```

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Delete User

Delete a user and all their associated properties.

- **URL**: `/users/delete`
- **Method**: `DELETE`
- **Auth Required**: Yes (Firebase-UID header)

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses:**

- **Code**: 401 Unauthorized
- **Content**: Same as Get User Profile endpoint

- **Code**: 404 Not Found
- **Content**: 
```json
{
  "message": "User not found"
}
```

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

## Property Endpoints

### Create Property

Create a new property for the authenticated user.

- **URL**: `/properties`
- **Method**: `POST`
- **Auth Required**: Yes (Firebase-UID header)
- **Content-Type**: `application/json`

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Request Body:**

```json
{
  "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
  "cells": ["-740111,577507", "-740113,577510", "..."],
  "price": 30,
  "name": "my place",
  "description": "A nice property",
  "address": "123 Main St",
  "forSale": false,
  "salePrice": 4
}
```

**Success Response:**

- **Code**: 201 Created
- **Content**: 
```json
{
  "message": "Property created successfully",
  "property": {
    "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740111,577507", "-740113,577510", "..."],
    "price": 30,
    "name": "my place",
    "description": "A nice property",
    "address": "123 Main St",
    "forSale": false,
    "salePrice": 4
  }
}
```

**Error Responses:**

- **Code**: 400 Bad Request
- **Content**: 
```json
{
  "message": "Property with this ID already exists"
}
```

- **Code**: 401 Unauthorized
- **Content**: Same as Get User Profile endpoint

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Get All Properties

Retrieve all properties in the database.

- **URL**: `/properties`
- **Method**: `GET`
- **Auth Required**: No

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
[
  {
    "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740111,577507", "-740113,577510", "..."],
    "price": 30,
    "name": "my place",
    "description": "A nice property",
    "address": "123 Main St",
    "forSale": false,
    "salePrice": 4
  },
  {
    "id": "0f8768af-0ac0-4834-8bc2-92d6f729066a",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740138,577514", "-740137,577514", "..."],
    "price": 360,
    "name": "my property",
    "description": "this is test description",
    "address": "i dont know",
    "forSale": true,
    "salePrice": 400
  }
]
```

**Error Response:**

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Get Properties For Sale

Retrieve all properties that are listed for sale.

- **URL**: `/properties/for-sale`
- **Method**: `GET`
- **Auth Required**: No

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
[
  {
    "id": "0f8768af-0ac0-4834-8bc2-92d6f729066a",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740138,577514", "-740137,577514", "..."],
    "price": 360,
    "name": "my property",
    "description": "this is test description",
    "address": "i dont know",
    "forSale": true,
    "salePrice": 400
  }
]
```

**Error Response:**

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Get Property By ID

Retrieve a specific property by its ID.

- **URL**: `/properties/:id`
- **Method**: `GET`
- **Auth Required**: No
- **URL Parameters**: `id=[string]` where `id` is the property's ID

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
  "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
  "cells": ["-740111,577507", "-740113,577510", "..."],
  "price": 30,
  "name": "my place",
  "description": "A nice property",
  "address": "123 Main St",
  "forSale": false,
  "salePrice": 4
}
```

**Error Responses:**

- **Code**: 404 Not Found
- **Content**: 
```json
{
  "message": "Property not found"
}
```

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Get User's Properties

Retrieve all properties owned by the authenticated user.

- **URL**: `/properties/user/my-properties`
- **Method**: `GET`
- **Auth Required**: Yes (Firebase-UID header)

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
[
  {
    "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740111,577507", "-740113,577510", "..."],
    "price": 30,
    "name": "my place",
    "description": "A nice property",
    "address": "123 Main St",
    "forSale": false,
    "salePrice": 4
  },
  {
    "id": "0f8768af-0ac0-4834-8bc2-92d6f729066a",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740138,577514", "-740137,577514", "..."],
    "price": 360,
    "name": "my property",
    "description": "this is test description",
    "address": "i dont know",
    "forSale": true,
    "salePrice": 400
  }
]
```

**Error Responses:**

- **Code**: 401 Unauthorized
- **Content**: Same as Get User Profile endpoint

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Update Property

Update an existing property owned by the authenticated user.

- **URL**: `/properties/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Firebase-UID header)
- **URL Parameters**: `id=[string]` where `id` is the property's ID
- **Content-Type**: `application/json`

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Request Body:**

```json
{
  "name": "Updated Property Name",
  "description": "Updated description",
  "address": "456 New St",
  "forSale": true,
  "salePrice": 500
}
```

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "message": "Property updated successfully",
  "property": {
    "id": "521350ee-532d-4f24-b4b9-a51b8c6b2c76",
    "owner": "d7yZVWdS8fd8jnxLYdw6SDEemMo2",
    "cells": ["-740111,577507", "-740113,577510", "..."],
    "price": 30,
    "name": "Updated Property Name",
    "description": "Updated description",
    "address": "456 New St",
    "forSale": true,
    "salePrice": 500
  }
}
```

**Error Responses:**

- **Code**: 401 Unauthorized
- **Content**: Same as Get User Profile endpoint

- **Code**: 403 Forbidden
- **Content**: 
```json
{
  "message": "Not authorized to update this property"
}
```

- **Code**: 404 Not Found
- **Content**: 
```json
{
  "message": "Property not found"
}
```

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
```

---

### Delete Property

Delete a property owned by the authenticated user.

- **URL**: `/properties/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Firebase-UID header)
- **URL Parameters**: `id=[string]` where `id` is the property's ID

**Headers:**

```
Firebase-UID: d7yZVWdS8fd8jnxLYdw6SDEemMo2
```

**Success Response:**

- **Code**: 200 OK
- **Content**: 
```json
{
  "message": "Property deleted successfully"
}
```

**Error Responses:**

- **Code**: 401 Unauthorized
- **Content**: Same as Get User Profile endpoint

- **Code**: 403 Forbidden
- **Content**: 
```json
{
  "message": "Not authorized to delete this property"
}
```

- **Code**: 404 Not Found
- **Content**: 
```json
{
  "message": "Property not found"
}
```

- **Code**: 500 Server Error
- **Content**: 
```json
{
  "message": "Server error",
  "error": "Error message details"
}
``` 