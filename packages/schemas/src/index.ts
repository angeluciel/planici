import { z } from "zod";

export const CreateUser = z.object({
  email: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Email is required.' : 'Invalid input.'),
    })
    .min(1, { error: 'Email is required.' })
    .pipe(z.email({ error: 'Invalid email.' }))
    .transform((val) => val.toLowerCase().trim()),
  name: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Name is missing.' : 'Invalid name.'),
    })
    .min(1, { error: 'Name is required.' }),
  password: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Password is missing.' : 'Invalid password.'),
    })
    .min(8, { error: 'Password is too weak.' }),
})