import React from "react";
import heroImage from "../../assets/hero.png";

// Mobile-only closing panel: a photo with a quote overlay, shown after
// the form. Uses the existing src/assets/hero.png.
export default function AuthPhotoQuote({
    quote = "Education is the most powerful weapon which you can use to change the world.",
}) {
    return (
        <div className="md:hidden relative mx-5 mb-10 rounded-2xl overflow-hidden">
            <img src={heroImage} alt="" className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <p
                className="absolute bottom-0 left-0 right-0 px-5 pt-10 pb-5 text-white text-[13.5px] leading-relaxed font-medium"
                style={{ fontFamily: "var(--font-body)" }}
            >
                "{quote}"
            </p>
        </div>
    );
}