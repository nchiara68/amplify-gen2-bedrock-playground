"use client";
// Ensures this file is treated as client-side in a Next.js application.

import { useState } from "react";
// Importing React's `useState` hook to manage local component state.

import { Geist, Geist_Mono } from "next/font/google";
// Importing Google Fonts with Next.js built-in font optimization features for better performance.

import { Authenticator } from "@aws-amplify/ui-react";
// Importing Amplify's `Authenticator` component to handle authentication flows such as sign-in, sign-out, and user sessions.

import { Amplify } from "aws-amplify";
// Importing the Amplify library to configure the connection to AWS services.

import Header from "./components/Header";
// Importing a custom `Header` component, likely handling the app's header section.

import Sidebar from "./components/Sidebar";
// Importing a custom `Sidebar` component for displaying navigation or other content in a side panel.

import ToggleSidebarButton from "./components/ToggleSidebarButton";
// Importing a button component used to toggle the visibility of the sidebar.

import "@aws-amplify/ui-react/styles.css";
// Importing Amplify's default styles for consistent UI design of its components.

import outputs from "../../amplify_outputs.json";
// Importing the AWS Amplify configuration JSON file. This contains environment-specific configuration
// like API keys, AWS region, Cognito user pool info, etc.

import "./globals.css";
// Importing global CSS for the application. This usually includes general resets or common styles.

import { ConfigureAmplify } from "./ConfigureAmplify";

Amplify.configure(outputs);
// Configuring AWS Amplify using the imported JSON file. This connects your app to AWS resources defined in Amplify.

const geistSans = Geist({
    variable: "--font-geist-sans",
    // Defining a CSS variable for the Geist Sans font to be used in global styles.
    subsets: ["latin"],
    // Limiting font subsets to Latin to reduce file size and optimize performance.
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    // Defining a CSS variable for the Geist Mono font.
    subsets: ["latin"],
    // Restricting font subsets to Latin characters.
});

// Default export of the `RootLayout` component. This serves as the layout wrapper for all pages.
export default function RootLayout({
    children, // The `children` prop represents the components that will be nested within this layout.
}: Readonly<{
    children: React.ReactNode; // Ensuring `children` is of type ReactNode (valid JSX or React elements).
}>) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // State hook to manage whether the sidebar is open or closed.

    return (
        <html lang="en">
            {/* Setting the document's language for accessibility and SEO purposes. */}
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                // Applying the custom font variables globally and adding `antialiased` for smoother font rendering.
            >
                <Authenticator>
                    {/* The `Authenticator` component provides a complete authentication solution.
                        It handles sign-in, sign-out, and user session management. */}
                    {({ signOut }) => (
                        // The render prop pattern is used here, passing `signOut` (function) and `user` (object)
                        // from the `Authenticator` component to customize the UI.
                        <main>
                            <Header onSignOut={() => signOut?.()} />
                            {/* Rendering the `Header` component and passing a `signOut` handler as a prop.
                                    This allows the user to sign out when clicking a logout button in the header. */}
                            <ToggleSidebarButton
                                isOpen={isSidebarOpen}
                                onToggle={() =>
                                    setIsSidebarOpen(!isSidebarOpen)
                                }
                                // The `ToggleSidebarButton` toggles the sidebar's visibility by updating state.
                            />
                            <Sidebar
                                isOpen={isSidebarOpen}
                                onClose={() => setIsSidebarOpen(false)}
                                // The `Sidebar` component receives props to manage its open/close state.
                            />
                            <div>
                                <main>
                                    <ConfigureAmplify />
                                    {children}
                                </main>
                            </div>
                            {/* Rendering the child components that are passed to this layout.
                                    These represent the page-specific content. */}
                        </main>
                    )}
                </Authenticator>
            </body>
        </html>
    );
}
