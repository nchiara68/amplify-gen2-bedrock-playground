"use client";

import { Amplify } from "aws-amplify";
import config from "@/../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(config);

export const ConfigureAmplify = () => {
    return null;
};
