# build with
# docker build --rm --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t bsoe-build .
# to match up user and group ids with the host system

# run with
# docker run -it --rm \
#   -v $(pwd):/home/builder/bsoe \
#   bsoe-build


FROM debian:bullseye

# Arguments for user configuration
ARG USER_ID=1000
ARG GROUP_ID=1000
ARG USERNAME=builder

# Configure locales and enable multiarch in a single layer
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y \
        locales \
        avahi-daemon \
        build-essential \
        diffstat \
        texi2html \
        cvs \
        subversion \
        gawk \
        chrpath \
        screen \
        patchutils \
        ruby \
        libgl1-mesa-dev \
        libglu1-mesa-dev \
        uuid-dev \
        libsdl1.2-dev \
        lzop \
        autofs \
        zip \
        curl \
        tftpd-hpa \
        nfs-server \
        ed \
        dbus-x11 \
        time \
        texinfo \
        bc \
        libpcre16-3 \
        rsync \
        wget \
        pigz \
        moreutils \
        libc6:i386 \
        libstdc++6:i386 \
        libglib2.0-0:i386 \
        g++-multilib \
        libxcb-icccm4 \
        libxcb-image0 \
        libxcb-shape0 \
        libxcb-keysyms1 \
        libxcb-render-util0 \
        libxcb-xinerama0 \
        libxcb-xkb1 \
        libxkbcommon-x11-0 \
        libxkbcommon0 \
        python3-requests \
        git \
        apticron \
        etckeeper && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    echo 'LANG="en_US.UTF-8"' > /etc/default/locale && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    echo "dash dash/sh boolean false" | debconf-set-selections && \
    dpkg-reconfigure --frontend=noninteractive dash && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update && \
    apt-get install -y \
        lsb-release \
        cpio \
        sudo \
        file

# Create user with the same UID/GID as the host user
RUN groupadd -g ${GROUP_ID} ${USERNAME} && \
    useradd -m -u ${USER_ID} -g ${USERNAME} -s /bin/bash ${USERNAME} && \
    echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set environment variables
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

# Define healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Set working directory
WORKDIR /home/${USERNAME}/bsoe

# Switch to non-root user
USER ${USERNAME}

RUN ulimit -n 8192 && \
    ulimit -u 4096 && \
    ulimit -l unlimited && \
    ulimit -s 8192 && \
    ulimit -v unlimited

# Default command
CMD ["/bin/bash"]