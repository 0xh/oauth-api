FROM amazonlinux

# node + yarn
RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
RUN curl --silent https://dl.yarnpkg.com/rpm/yarn.repo > /etc/yum.repos.d/yarn.repo
RUN yum -y install findutils nodejs npm yarn python27 wget

# java
RUN yum install -y java-1.8.0-openjdk java-1.8.0-openjdk-devel && yum clean all

# working directory
ADD ./ /code
WORKDIR /code

RUN yarn global add serverless@1.30.0
RUN yarn install
