export function CameraIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 4.5h6l1.2 2H20a2 2 0 0 1 2 2v9A2.5 2.5 0 0 1 19.5 20H4.5A2.5 2.5 0 0 1 2 17.5v-9a2 2 0 0 1 2-2h3.8L9 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function TagIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 13.5 13.5 20a2.2 2.2 0 0 1-3.1 0l-7.9-7.9A2.2 2.2 0 0 1 2 10.6V4.8A2.8 2.8 0 0 1 4.8 2h5.8a2.2 2.2 0 0 1 1.6.7l7.8 7.8a2.2 2.2 0 0 1 0 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7.5h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
