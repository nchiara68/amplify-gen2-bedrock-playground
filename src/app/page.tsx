// import { redirect } from "next/navigation";

export default function Home() {
    // Automatically redirect to /simpleChat
    // redirect("/simpleChat");
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
            }}
        >
            <main>
                <h1 style={{ fontSize: "4rem", fontWeight: "bold" }}>
                    superluminal
                </h1>
            </main>
        </div>
    );
}
