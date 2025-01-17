"use client";
// This directive ensures that this file is treated as client-side code in a Next.js application.

import { Button } from "@aws-amplify/ui-react";
// Importing the `Button` component from AWS Amplify's UI React library. 
// This is used to create a consistent and styled button for the Sign Out action.

export default function Header({ onSignOut }: { onSignOut: () => void }) {
    // The `Header` functional component is exported as the default export of this file.
    // It receives a single prop, `onSignOut`, which is a function invoked when the user clicks the Sign Out button.

    return (
        <header className="absolute top-4 right-4">
            {/* The `header` element acts as a container for the button.
                - `absolute`: Positions the header element absolutely relative to its closest positioned ancestor.
                - `top-4`: Adds spacing of 4 units (likely 16px) from the top of the page.
                - `right-4`: Adds spacing of 4 units (likely 16px) from the right edge of the page.
                This places the header (and its content) in the top-right corner of the page. */}
            
            <Button onClick={onSignOut}>
                {/* The `Button` component is a styled button provided by AWS Amplify UI. 
                    - The `onClick` event is bound to the `onSignOut` function passed as a prop.
                    When clicked, this will trigger the sign-out process. */}
                Sign Out
            </Button>
        </header>
    );
}