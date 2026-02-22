# Stage 1: Build the Angular application
FROM node:25-alpine AS build
WORKDIR /app
COPY ./package*.json ./
RUN npm i
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Remove default nginx index.html
RUN rm -rf /usr/share/nginx/html/*
# Copy the built Angular app from the build stage to the Nginx static files directory
COPY --from=build /app/dist/app/browser/ /usr/share/nginx/html 
# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]