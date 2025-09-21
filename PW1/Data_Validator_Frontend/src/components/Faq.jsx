import React, { useState } from "react";
import "./css/Faq.css";

const faqs = [
    {
        question: "What is Data Validator?",
        answer:
            "Data Validator is a tool that helps you validate and clean your data efficiently before processing.",
    },
    {
        question: "How do I use the Data Validator?",
        answer:
            "Simply upload your dataset, select the validation rules, and let the tool process your data.",
    },
    {
        question: "Is my data secure?",
        answer:
            "Yes, your data is processed securely and is not stored after validation.",
    },
    {
        question: "Can I customize validation rules?",
        answer:
            "Absolutely! You can create and apply custom validation rules to fit your needs.",
    },
];

function Faq() {
    const [openIndex, setOpenIndex] = useState(null);

    const handleToggle = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div className="faq-section" id="faqs">
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <div className="faq-container">
                <div className="faq-list">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className={`faq-item${openIndex === idx ? " open" : ""}`}
                        >
                            <button
                                onClick={() => handleToggle(idx)}
                                className="faq-question"
                                aria-expanded={openIndex === idx}
                                style={{
                                    background: "none",
                                    border: "none",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>{faq.question}</span>
                                <span
                                    style={{
                                        fontSize: "1.2em",
                                        marginLeft: "8px",
                                        transition: "transform 0.2s",
                                        transform: openIndex === idx ? "rotate(45deg)" : "none",
                                    }}
                                    aria-hidden="true"
                                >
                                    +
                                </span>
                            </button>
                            <div className="faq-answer">
                                {faq.answer}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Faq;