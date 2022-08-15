import { useState } from 'react'
import { GetStaticProps } from 'next'
import PortableText from 'react-portable-text'
import { useForm, SubmitHandler } from 'react-hook-form'

import Header from '../../components/Header'
import { sanityClient, urlFor } from '../../sanity'
import { Post } from '../../typings'

interface Props {
  post: Post
}

interface FormInput {
  _id: string
  name: string
  email: string
  comment: string
}

const Post = ({ post }: Props) => {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>()

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    fetch('/api/createComment', {
      method: 'POST',
      body: JSON.stringify(data),
    })
      .then(() => setSubmitted(true))
      .catch((err) => setSubmitted(false))
  }

  return (
    <main>
      <Header />
      <img
        className="h-40 w-full object-cover"
        src={urlFor(post.mainImage).url()!}
        alt=""
      />
      <article className="mx-auto max-w-3xl p-5">
        <h1 className="mt-10 mb-3 text-3xl">{post.title}</h1>
        <h2 className="mb-2 text-xl font-light text-gray-500">
          {post.description}
        </h2>
        <div className="flex items-center space-x-2">
          <img
            className="h-10 w-10 rounded-full"
            src={urlFor(post.author.image).url()!}
            alt=""
          />
          <p className="text-sm font-extralight">
            Blog post by{' '}
            <span className="text-green-600">{post?.author?.name} </span> -
            Published at {new Date(post._createdAt).toLocaleString()}
          </p>
        </div>
        <div className="mt-10">
          <PortableText
            className=""
            dataset={process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'!}
            projectId={process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '26wzcgc5'!}
            content={post.body}
            serializers={{
              h1: (props: any) => (
                <h1 {...props} className="my-5 text-2xl font-bold" />
              ),
              h2: (props: any) => (
                <h1 {...props} className="my-5 text-xl font-bold" />
              ),
              li: ({ children }: any) => (
                <li {...children} className="ml-4 list-disc" />
              ),
              link: ({ href, children }: any) => (
                <a
                  href={href}
                  {...children}
                  className="text-blue-500 hover:underline"
                />
              ),
            }}
          />
        </div>
      </article>
      <hr className="my-5 mx-auto max-w-lg border border-yellow-500" />
      {submitted ? (
        <div className="my-10 mx-auto flex max-w-2xl flex-col bg-yellow-500 py-10 text-white">
          <h3 className="text-3xl font-bold">
            Thank you for submitting your comment
          </h3>
          <p>Once it has been approved, it will appear below!</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto mb-10 flex max-w-2xl flex-col p-5"
        >
          <h3 className="text-sm text-yellow-500">Enjoyed this article?</h3>
          <h4 className="text-3xl font-bold">Leave a comment below!</h4>
          <hr className="mt-2 py-3" />

          <input
            {...register('_id')}
            name="_id"
            type="hidden"
            value={post._id}
          />
          <label className="mb-5 block">
            <span className="text-gray-700">Name</span>
            <input
              {...register('name', { required: true })}
              className="form-input mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-yellow-500 focus:ring"
              placeholder="Jhon Applessed"
              type="text"
            />
          </label>
          <label className="mb-5 block">
            <span className="text-gray-700">Email</span>
            <input
              {...register('email', { required: true })}
              className="form-input mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-yellow-500 focus:ring"
              placeholder="Jhon Applessed"
              type="email"
            />
          </label>
          <label className="mb-5 block">
            <span className="text-gray-700">Comment</span>
            <textarea
              {...register('comment', { required: true })}
              className="form-textarea mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-yellow-500 focus:ring"
              placeholder="Jhon Applessed"
              rows={8}
            />
          </label>
          {/*  error will return when field validation fails */}
          <div className="flex flex-col p-5">
            {errors.name && <p className="text-red-500">Name is required</p>}
            {errors.email && <p className="text-red-500">Email is required</p>}
            {errors.comment && (
              <p className="text-red-500">Comment is required</p>
            )}
          </div>
          <input
            type="submit"
            className="focus:shadow-outline cursor-pointer rounded bg-yellow-500 py-2 px-4 font-bold text-white shadow hover:bg-yellow-400 focus:outline-none"
          />
        </form>
      )}
    </main>
  )
}

export default Post

export const getStaticPaths = async () => {
  const query = `*[_type == "post"] {
    _id , slug {current}
    }`
  const posts = await sanityClient.fetch(query)

  const paths = posts.map((post: Post) => ({
    params: { slug: post?.slug?.current },
  }))

  return {
    paths,
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const query = `*[_type == "post" && slug.current == $slug][0] {
        _id ,createdAt , title , author -> {
          name , image
        }, "comments" : *[_type == "comment" && post._ref == ^._id && approved == true], description , mainImage , slug , body
      }`
  const post = await sanityClient.fetch(query, { slug: params?.slug })

  if (!post?.title) {
    return { notFound: true }
  }
  return { props: { post }, revalidate: 60 }
}

// after 60 seconds revalidate the page
