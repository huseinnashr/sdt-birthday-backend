# Information
## Notes
- Repo is using clean architecture, which have 3 layers of abstraction. From top to bottom are handler, usecase, and repo. Handle will handle transformation of user request. Usecase contain bussiness logic and repo handle communication with resources and 3rd party.
- You can see test case example in `src/usecase/user/user.usecase.test.ts`. As you can see, because we're using Dependency Injection (DI), we can easily mock the dependency, no need to do monkey patching.
- Config still work in progress, secret should be loaded from ENV or secret file and should not be stored on git repo.

# Getting Started
## 1. Run Docker and Services
1. Install `docker-desktop`
2. Run `docker-compose up`
3. You should see postgres running, `http` and `cron` will have error. We'll solve that by doing db migration below

## 2. DB Migration
1. Install Goose
2. Export the following ENV
```
export GOOSE_DRIVER=postgres 
export GOOSE_DBSTRING="postgres://postgres:postgres@localhost:5432/birthday" 
```
3. Run `goose -dir migration up`
4. Restart `http` and `cron` by modifying a file in `/src` (don't forget to save the file). At this step, cron should be working and you can test http endpoint by running `cURLs` below

## 3. cURLs
### Create User
```sh
curl --location 'localhost:3000/users' \
--header 'Content-Type: application/json' \
--data '{
    "firstName": "Zooey",
    "lastName": "Deschanel",
    "birthday": "1990-02-22",
    "gmtOffset": "-1.5"
}'
```

### Update User
```sh
curl --location --request PUT 'localhost:3000/users/11' \
--header 'Content-Type: application/json' \
--data '{
    "firstName": "Hope",
    "lastName": "Deschanel",
    "birthday": "1992-03-21",
    "gmtOffset": "3"
}'
```

### Delete User
```sh
curl --location --request DELETE 'localhost:3000/users/11' \
--data ''
```

# Documentation
## ERD
```mermaid
erDiagram
USERS {
    bigint id PK
    string first_name
    string last_name
    date birthday_date
    string gmt_offset
}