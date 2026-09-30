# SFSU-csc648-06-Fall26--team06
# Team and Roles 
|Team Member | Role | 
| --- | --- |
| **Emely Sarceno Bravo** | Team Lead | 
| **David Gomez** | Front-End Lead | 
| **Kelsey Codilla** | Back-End Lead | 
| **Emerson Berido** | Scrum Master | 
| **Tavasya Ganpati** | GitHub Master | 
| **Phong Nguyen** | AI Lead | 

# Software Stack

| Category | Technology |
| --- | --- |
| **Hosting Platform** | Vercel |
| **Database / Backend Services** | Supabase (Managed PostgreSQL) |
| **Front-End Technology** | React |
| **Styling** | Tailwind CSS |
| **Application Framework / Back-End Technology** | Next.js, JavaScript |
| **AI Technology** | OpenAI API |
| **3D Capture Technology** | Scaniverse (Niantic Spatial) |
| **3D Development / Rendering** | Unity |

# How to Access Hosting Platform

| Item                          | Credentials / Access                                        |
| ----------------------------- | ----------------------------------------------------------- |
| **Team Website URL (Vercel)** | https://sfsu-csc648-06-fall26-team06-three.vercel.app/about |
| **Supabase Database**         | Access was provided through an email invitation              |


## Team Familiarity

**Scale:** 1 = Never Used It · 2 = Basic · 3 = Intermediate · 4 = Advanced

| Technology | David | Kelsey | Emerson | Tavasya | Phong | Emely |
|---|---:|---:|---:|---:|---:|---:|
| Vercel | 1 | 1 | 1 | 4 | 1 | 1 |
| Supabase | 1 | 2 | 3 | 4 | 2 | 3 |
| React | 3 | 2 | 4 | 4 | 2 | 4 |
| Tailwind CSS | 1 | 1 | 2 | 4 | 1 | 3 |
| Next.js | 2 | 2 | 1 | 3 | 1 | 3 |
| OpenAI API | 2 | 1 | 1 | 4 | 3 | 1 |
| Scaniverse | 1 | 2 | 2 | 1 | 2 | 2 |
| Unity | 1 | 4 | 4 | 4 | 2 | 1 |

# Study Plan

## Study Plan Approach
Our team will conduct focused study sessions throughout the first month of development to ensure that all members understand the technologies required to implement the application. Each Study session will have a designated leader(s) and participant(s), with specific technical goals that can be applied to the project by the end of the study session.

## React

**Leader:** David, Emerson, or Emely  
**Participants:** Kelsey and Phong  
**Complete Study Session Goals By:** Week 1

### Specific Goals to Accomplish

- Understand React component structure and reusable components.
- Understand props, state, and event handling.
- Learn how React handles user interactions and dynamically updated content.
- Understand how components communicate with one another.
- Learn how interactive UI elements, such as buttons, forms, filters, and search fields, are handled in React.
- Understand how reusable components can support the Events, Resources, Map, and other application pages.
- Establish basic React coding conventions for the team.

## TailwindCSS

**Leader:** Tavasya or Emely  
**Participants:** David, Kelsey, Emerson, and Phong  
**Complete Study Session Goals By:** Week 1

### Specific Goals to Accomplish

- Understand Tailwind CSS's utility-based styling system.
- Learn how Tailwind CSS is used to style layouts, cards, buttons, forms, navigation bars, and other UI elements.
- Understand how to create responsive designs for desktop and mobile screen sizes.
- Establish consistent typography, spacing, sizing, and visual conventions.
- Determine how the application's color palette and design system will be implemented.
- Understand how Tailwind CSS can help maintain consistent styling throughout the application.
- Identify best practices for organizing and maintaining styles across the team.

## Next.js

**Leader:** David, Tavasya, or Emely  
**Participants:** Emerson, Kelsey, and Phong  
**Complete Study Session Goals By:** Week 1

### Specific Goals to Accomplish

- Understand the basic structure and organization of a Next.js application.
- Learn how pages, layouts, components, and routing work in Next.js.
- Understand how React components are incorporated into Next.js.
- Learn how Next.js handles client-side and server-side functionality.
- Understand how to create API endpoints using Next.js Route Handlers.
- Learn how the Next.js application can connect to external services and the Supabase backend.
- Establish conventions for organizing pages, components, and shared functionality.

## Vercel

**Leader:** Tavasya  
**Participants:** David, Kelsey, Emerson, Phong, and Emely  
**Complete Study Session Goals By:** Week 2

### Specific Goals to Accomplish

- Understand how Vercel hosts and deploys Next.js applications.
- Review the team's existing Vercel deployment of the About page.
- Learn how Vercel deploys changes from the team's GitHub repository.
- Understand the difference between preview deployments and the production deployment.
- Learn how preview deployments can be used to review changes before they reach production.
- Understand how environment variables are configured in Vercel.
- Learn how sensitive information, such as API keys, should be protected.
- Determine the team's deployment workflow for the remainder of the project.
- Understand how to monitor deployments and troubleshoot common deployment errors.

## Supabase

**Leader:** Tavasya, Emerson, or Emely  
**Participants:** David, Kelsey, and Phong  
**Complete Study Session Goals By:** Week 2

### Specific Goals to Accomplish

- Understand how Supabase will function as the application's backend and database platform.
- Learn how to create and manage PostgreSQL tables through Supabase.
- Determine the database structure needed for events, resources, users, interests, saved items, and related information.
- Understand how the application will retrieve, insert, update, and delete data.
- Learn how Supabase authentication works.
- Understand how to connect the Next.js application to Supabase securely.
- Learn about Row Level Security (RLS) and how it protects database records from unauthorized access.
- Establish database conventions so team members interact with the backend consistently.

## OpenAI API

**Leader:** Phong or Tavasya  
**Participants:** David, Kelsey, Emerson, and Emely  
**Complete Study Session Goals By:** Week 2

### Specific Goals to Accomplish

- Understand how the OpenAI API can be integrated into a Next.js application.
- Learn how to securely send requests to the API without exposing API keys.
- Understand how user prompts are submitted and how AI-generated responses are returned.
- Learn about prompt engineering and structured AI responses.
- Determine how the AI Campus Assistant will support questions about campus information, events, resources, and application functionality.
- Understand how relevant application data can be provided to the AI assistant.
- Identify limitations, error cases, and situations where the assistant should avoid providing unsupported information.
- Establish guidelines for handling questions the assistant cannot answer accurately.

## Scaniverse

**Leader:** Kelsey, Emerson, Phong, or Emely  
**Participants:** David and Tavasya  
**Complete Study Session Goals By:** Week 3

### Specific Goals to Accomplish

- Understand how Scaniverse can be used to capture a real-world SFSU environment.
- Learn the scanning process and requirements for creating a usable 3D representation.
- Determine the specific portion of the Cesar Chavez Student Center that will be captured.
- Understand the types of 3D data and outputs Scaniverse can produce.
- Learn how Scaniverse scans can be processed and exported.
- Determine the file formats, quality, size, and technical requirements relevant to the project.
- Understand how Scaniverse output can be incorporated into a Unity workflow.
- Identify limitations that could affect scanning the selected environment.
- Document the planned Scaniverse workflow for the project.

## Unity

**Leader:** Kelsey, Emerson, or Tavasya  
**Participants:** David, Phong, and Emely  
**Complete Study Session Goals By:** Week 4

### Specific Goals to Accomplish

- Understand the basic Unity interface and project structure.
- Learn how Unity handles 3D environments and assets.
- Understand how Scaniverse-generated 3D content can be imported into Unity.
- Learn how users can navigate and interact with a 3D environment in Unity.
- Understand how interactive points of interest can be incorporated into a 3D environment.
- Determine how locations such as rooms, services, food locations, and study spaces could be represented.
- Understand the technical requirements for making the Unity experience accessible through the web application.
- Identify technical limitations associated with using Unity for the project.
- Determine which Unity features are necessary for the MVP and which can be considered future enhancements.
- Document the planned workflow from Scaniverse to Unity to the web application.

## One-Month Study Timeline

| Technology | Study Session Deadline |
|---|---|
| React | Week 1 |
| Tailwind CSS | Week 1 |
| Next.js | Week 1 |
| Vercel | Week 2 |
| Supabase | Week 2 |
| OpenAI API | Week 2 |
| Scaniverse | Week 3 |
| Unity | Week 4 |

# Communication

Our primary communication platform is Discord, with dedicated channels for project updates, technical support, study resources, and assignment-related information. We also use When2Meet to coordinate additional meetings and group calls based on team availability.

| Communication Method | Details |
|---|---|
| **Discord** | Primary communication platform. It is used for project updates, technical support, study resources, and assignment-related information |
| **When2Meet** | Used to coordinate additional meetings based on team availability |
| **Soft-Fixed Meeting** | Fridays at 7:00 PM |
| **Meeting Format** | Virtual meetings |

# Why Our About Page Matters

Our About page provides visitors with a clear introduction to our team, our individual backgrounds, and how we collaborate throughout the project.

1. **SFSU Visual Identity:** SFSU's purple and gold color palette creates a consistent visual identity and connects the page to our campus community.

2. **Networking:** Each team member has a profile with a short bio and direct LinkedIn and GitHub links, allowing visitors to learn more about our backgrounds and connect with us professionally.

3. **Showcasing Our Work:** GitHub links allow visitors to explore projects we have worked on beyond this class, highlighting our individual technical skills and experiences.

4. **Team Transparency:** The page clearly displays each member's role, meeting schedule, and communication methods so visitors can understand how our team is organized and collaborates.

5. **Interactive User Experience:** Clicking on a team member opens a modal containing additional information, keeping the page clean and organized while allowing visitors to view more details when they are interested.