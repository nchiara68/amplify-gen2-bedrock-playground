"use client";

import { Flex, Heading, View, Text } from "@aws-amplify/ui-react";
import { Authenticator } from "@aws-amplify/ui-react";
import { AIConversation } from "@aws-amplify/ui-react-ai";
import { useAIConversation } from "../../client";

export default function ACTCounselor() {
    const selectedModel = "chat";

    const [
        {
            data: { messages },
            isLoading,
        },
        handleSendMessage,
    ] = useAIConversation(selectedModel);

    return (
        <Authenticator>
            {({ signOut, user }) => (
                <Flex direction="column" gap="1rem" style={{ width: "100%" }}>
                    <Flex>
                        <Heading level={1}>ACT Counselor</Heading>
                    </Flex>
                    <Text>Features: Chat Conversation, Prompt Engineering</Text>
                    <View>
                        <AIConversation
                            messages={messages}
                            isLoading={isLoading}
                            handleSendMessage={handleSendMessage}
                        />
                    </View>
                </Flex>
            )}
        </Authenticator>
    );
}

// "use client";
// import { Authenticator } from "@aws-amplify/ui-react";
// import { AIConversation } from "@aws-amplify/ui-react-ai";
// import { useAIConversation } from "@/client";

// export default function Page() {
//     const [
//         {
//             data: { messages },
//             isLoading,
//         },
//         handleSendMessage,
//     ] = useAIConversation("chat");
//     // 'chat' is based on the key for the conversation route in your schema.

//     return (
//         <Authenticator>
//             <AIConversation
//                 messages={messages}
//                 isLoading={isLoading}
//                 handleSendMessage={handleSendMessage}
//             />
//         </Authenticator>
//     );
// }
