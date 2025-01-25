import { defineStorage } from "@aws-amplify/backend";

export const virtualCompanyStorage = defineStorage({
    name: "virtualCompany",
    access: (allow) => ({
        "datasets/*": [allow.authenticated.to(["read", "write", "delete"])],
        "faiss_indexes/*": [allow.authenticated.to(["read", "write", "delete"])],
    }),
    // https://aws.amazon.com/blogs/aws/connect-users-to-data-through-your-apps-with-storage-browser-for-amazon-s3/
});
