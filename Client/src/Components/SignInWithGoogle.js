import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./Firebase";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "../Styles/signInWithGoogle.module.css"

function SignInwithGoogle() {
  const router = useRouter(); // Use useRouter from Next.js

  async function googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) throw new Error("User not found");

      const userRef = doc(db, "Users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        toast.success("Welcome back!", { position: "top-center" });
        router.push("/profile");
      } else {
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName,
          photo: user.photoURL || null, // Avoid empty string issue
          gender: "",
          age: "",
        });
        toast.info("Please complete your profile.", { position: "top-center" });
        router.push("/personal-details");
      }
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        toast.warning("Sign-in popup closed. Please try again.", { position: "top-center" });
      } else {
        console.error("Google Sign-In Error:", error);
        toast.error(error.message || "Something went wrong. Try again later.", { position: "top-center" });
      }
    }
  }


  return (
    <div className="relative top-[25%]">
      <div
        className="imgdiv"
        style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
        onClick={googleLogin}
      >
        <button className={`${styles.btn}`}>
          <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262">
            <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
            <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
            <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"></path>
            <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
          </svg>
          Continue with Google
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}

export default SignInwithGoogle;
