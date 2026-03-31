const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    const isDev =  process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        error: isDev ? err.message : 'Something went wrong',
    });
};

export default errorHandler;