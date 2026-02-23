# Stage 1: Build the Angular application
FROM node:24-alpine AS build
WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Remove default nginx index.html
RUN rm -rf /usr/share/nginx/html/*

# Copy the built Angular app from the build stage to the Nginx static files directory
# COPY --from=build /app/dist/app/browser/ /usr/share/nginx/html 

# Copying a prebuilt dist built on local because Digital Ocean takes forever to run ng build
COPY ./dist/app/browser/ /usr/share/nginx/html 

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf
COPY ./ssl/resumefire.io.pem /etc/nginx/ssl/resumefire.io.pem
COPY ./ssl/resumefire.io.key /etc/nginx/ssl/resumefire.io.key

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]