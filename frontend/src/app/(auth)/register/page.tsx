"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { register } from "@/services/api/auth";

export default function RegisterPage() {
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("listener");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			await register({
				email,
				password,
				display_name: displayName,
				role,
			});
			router.push("/login");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Register failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<form
				onSubmit={handleSubmit}
				className="bg-white p-8 rounded shadow-md w-full max-w-md"
			>
				<h2 className="text-2xl text-gray-800 font-bold mb-6 text-center">Create your account</h2>
				{error && (
					<p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
						{error}
					</p>
				)}
				<div className="mb-4">
					<label className="block text-gray-700 mb-2" htmlFor="displayName">
						Display Name
					</label>
					<input
						id="displayName"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						required
						className="text-gray-400 w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
					/>
				</div>
				<div className="mb-4">
					<label className="block text-gray-700 mb-2" htmlFor="email">
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className="text-gray-400 w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
					/>
				</div>
				<div className="mb-4">
					<label className="block text-gray-700 mb-2" htmlFor="password">
						Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="text-gray-400 w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
					/>
				</div>
				<div className="mb-6">
					<label className="block text-gray-700 mb-2" htmlFor="role">
						Role
					</label>
					<select
						id="role"
						value={role}
						onChange={(e) => setRole(e.target.value)}
						required
						className="text-gray-400 w-full h-10 px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
					>
						<option value="listener">Listener</option>
						<option value="artist">Artist</option>
					</select>
				</div>
				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition duration-200"
				>
					{isSubmitting ? "Creating account..." : "Register"}
				</button>
				<p className="mt-4 text-sm text-gray-600 text-center">
					Have an account? <Link href="/login" className="text-blue-600">Login</Link>
				</p>
			</form>
		</div>
	);
}
